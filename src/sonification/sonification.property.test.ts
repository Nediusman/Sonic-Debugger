import fc from "fast-check";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import { nodeAtLine, describeNode } from "../parser";
import type { CodeTree, SoundEvent } from "../shared/types";
import { createPlayer, describeOverview, describeSoundEvent, sonifyError, sonifyNode, sonifyTree } from "./index";
import { depthFrequency } from "./mapping/pitch";
import { overviewLayout, preorder } from "./mapping/layout";
import { nodePan } from "./mapping/pan";
import { slotWeight } from "./mapping/timbre";
import { round2 } from "./mapping/order";
import { shuffledCopy, treeArb } from "./fixtures/arbitraries";
import { MockAudioContext } from "./fixtures/mockAudio";

const runs = { numRuns: 200 };
const trees = treeArb(400);
const either = fc.boolean().map((reducedSound) => ({ reducedSound }));
const numericFields = (e: SoundEvent): number[] => [e.startOffsetMs, e.durationMs, e.frequencyHz, e.gain, e.stereoPan];
const units = (tree: CodeTree): number => preorder(tree, tree.rootId).reduce((s, n) => s + slotWeight(n.kind), 0);
const isError = (e: SoundEvent): boolean => e.timbre === "error-sine" || e.timbre === "error-saw";

describe("pitch properties", () => {
  it("SP-1 [S-1] frequency equals the formula and is capped", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), (d) => {
      const i = Math.min(d, 14);
      const hz = round2(130.81 * 2 ** ((12 * Math.floor(i / 5) + [0, 2, 4, 7, 9][i % 5]) / 12));
      return depthFrequency(d) === hz && hz <= depthFrequency(14);
    }), runs);
  });
  it("SP-2 [S-2] deeper is never lower", () => {
    fc.assert(fc.property(fc.nat(100), fc.nat(100), (a, b) => depthFrequency(Math.min(a, b)) <= depthFrequency(Math.max(a, b))), runs);
  });
});

describe("layout properties", () => {
  it("SP-3 [S-11] noteMs is in [60, 220] and follows the formula", () => {
    fc.assert(fc.property(trees, (tree) => {
      const { noteMs, limited } = overviewLayout(tree);
      const expected = Math.min(220, Math.max(60, 10000 / units(tree)));
      return noteMs >= 60 && noteMs <= 220 && (limited || (noteMs <= expected && expected - noteMs < 0.01));
    }), runs);
  });
  it("SP-4 [S-12] every event ends by 10 s", () => {
    fc.assert(fc.property(trees, either, (tree, o) =>
      sonifyTree(tree, o).every((e) => e.startOffsetMs + e.durationMs <= 10000)), runs);
  });
  it("SP-5 [S-13] limit applies at 167 or more slot units", () => {
    fc.assert(fc.property(trees, (tree) => {
      const limited = units(tree) >= 167;
      const events = sonifyTree(tree);
      const total = Object.keys(tree.nodes).length;
      if (limited) {
        return events.every((e) => tree.nodes[e.nodeId].depth <= 2) &&
          describeOverview(tree) === `overview limited to top-level constructs, ${total} in total`;
      }
      return new Set(events.map((e) => e.nodeId)).size === total && describeOverview(tree).startsWith("Overview: ");
    }), runs);
  });
  it("SP-6 [S-14] output is sorted", () => {
    fc.assert(fc.property(trees, (tree) => {
      const e = sonifyTree(tree);
      return e.every((x, i) => i === 0 || x.startOffsetMs > e[i - 1].startOffsetMs ||
        (x.startOffsetMs === e[i - 1].startOffsetMs && (x.nodeId > e[i - 1].nodeId ||
          (x.nodeId === e[i - 1].nodeId && x.frequencyHz >= e[i - 1].frequencyHz))));
    }), runs);
  });
  it("SP-7 [S-15] siblings keep source order and pans follow the formula", () => {
    fc.assert(fc.property(trees, (tree) => {
      const events = sonifyTree(tree);
      const first = new Map<string, number>();
      for (const e of events) if (!first.has(e.nodeId)) first.set(e.nodeId, e.startOffsetMs);
      const panOk = events.every((e) => {
        const node = tree.nodes[e.nodeId];
        const owner = node.parentId === null ? null : tree.nodes[node.parentId];
        const n = owner ? owner.childIds.length : 1;
        const i = owner ? owner.childIds.indexOf(node.id) : 0;
        const pan = n === 1 ? 0 : round2(-0.8 + (1.6 * i) / (n - 1));
        return e.stereoPan === pan && pan >= -0.8 && pan <= 0.8 && pan === nodePan(tree, node);
      });
      const orderOk = Object.values(tree.nodes).every((p) => {
        const starts = p.childIds.map((c) => first.get(c)).filter((s): s is number => s !== undefined);
        return starts.every((s, i) => i === 0 || s >= starts[i - 1]);
      });
      return panOk && orderOk;
    }), runs);
  });
});

describe("level properties", () => {
  it("SP-8 [S-16] gain is in (0, 0.4]", () => {
    fc.assert(fc.property(trees, either, fc.integer({ min: -5, max: 500 }), (tree, o, line) =>
      [...sonifyTree(tree, o), ...sonifyError(tree, line, o), ...sonifyNode(tree, tree.rootId, o)].every((e) => e.gain > 0 && e.gain <= 0.4)), runs);
  });
  it("SP-9 [S-17] reduced sound halves duration and gain", () => {
    fc.assert(fc.property(trees, (tree) => {
      const full = sonifyTree(tree);
      const half = sonifyTree(tree, { reducedSound: true });
      return full.length === half.length && full.every((e, i) =>
        half[i].durationMs === round2(e.durationMs / 2) && half[i].gain === round2(e.gain / 2) &&
        half[i].nodeId === e.nodeId && half[i].startOffsetMs === e.startOffsetMs);
    }), runs);
  });
});

describe("error cue properties", () => {
  it("SP-10 [S-19, S-21] any integer line gives the same two-event pattern", () => {
    fc.assert(fc.property(trees, fc.integer({ min: -1000, max: 1000 }), (tree, line) => {
      const [a, b, ...rest] = sonifyError(tree, line);
      const node = nodeAtLine(tree, line) ?? tree.nodes[tree.rootId];
      const shape = (e: SoundEvent) => [e.startOffsetMs, e.durationMs, e.gain];
      return rest.length === 0 && a.frequencyHz === 311.13 && a.timbre === "error-sine" && b.frequencyHz === 440 &&
        b.timbre === "error-saw" && shape(a).join() === "0,600,0.4" && shape(b).join() === "0,600,0.4" &&
        a.nodeId === node.id && b.nodeId === node.id;
    }), runs);
  });
  it("SP-11 [S-20] normal output never contains the error cue", () => {
    fc.assert(fc.property(trees, either, (tree, o) => {
      const all = [...sonifyTree(tree, o), ...sonifyNode(tree, tree.rootId, o)];
      const pair = all.filter((e) => e.frequencyHz === 311.13).some((a) =>
        all.some((b) => b.frequencyHz === 440 && b.startOffsetMs === a.startOffsetMs));
      return !all.some(isError) && !pair;
    }), runs);
  });
});

describe("focus mode properties", () => {
  it("SP-12 [S-22, S-23, S-24] unknown ids give [], known ids start with their own events", () => {
    fc.assert(fc.property(trees, fc.nat(), fc.string(), (tree, pick, junk) => {
      const ids = Object.keys(tree.nodes);
      const id = ids[pick % ids.length];
      const own = sonifyNode(tree, id).filter((e) => e.nodeId === id);
      const unknown = Object.hasOwn(tree.nodes, junk) ? [] : sonifyNode(tree, junk);
      const overview = sonifyTree(tree).filter((e) => e.nodeId === id);
      const sameShape = overview.length === 0 || (own.length === overview.length && own.every((e, i) =>
        e.frequencyHz === overview[i].frequencyHz && e.timbre === overview[i].timbre &&
        e.stereoPan === overview[i].stereoPan && e.gain === overview[i].gain));
      return unknown.length === 0 && own.length > 0 && own[0].startOffsetMs === 0 && sameShape &&
        sonifyNode(tree, id).every((e) => preorder(tree, id).some((n) => n.id === e.nodeId));
    }), runs);
  });
});

describe("determinism properties", () => {
  it("SP-13 [S-25, S-27] repeat calls and key-shuffled copies agree", () => {
    fc.assert(fc.property(trees, (tree) => {
      const a = JSON.stringify(sonifyTree(tree));
      return a === JSON.stringify(sonifyTree(tree)) && a === JSON.stringify(sonifyTree(shuffledCopy(tree))) &&
        JSON.stringify(sonifyNode(tree, tree.rootId)) === JSON.stringify(sonifyNode(shuffledCopy(tree), tree.rootId));
    }), runs);
  });
  it("SP-14 [S-28] every number is rounded to two decimals", () => {
    fc.assert(fc.property(trees, either, (tree, o) =>
      [...sonifyTree(tree, o), ...sonifyNode(tree, tree.rootId, o), ...sonifyError(tree, 1, o)]
        .every((e) => numericFields(e).every((x) => x === round2(x)))), runs);
  });
});

describe("text equivalent properties", () => {
  it("SP-15 [S-29] describeSoundEvent follows the format", () => {
    fc.assert(fc.property(trees, fc.integer({ min: 0, max: 450 }), (tree, line) => {
      return [...sonifyTree(tree), ...sonifyError(tree, line)].every((e) => {
        const text = describeSoundEvent(e, tree);
        const subject = isError(e) ? "error cue" : describeNode(tree, tree.nodes[e.nodeId]);
        const side = e.stereoPan < -0.2 ? "left" : e.stereoPan > 0.2 ? "right" : "center";
        return text.length > 0 && !text.includes("\n") && text.includes(subject) &&
          text.includes(`${e.frequencyHz} hertz`) && text.endsWith(side) && text === describeSoundEvent(e, tree);
      });
    }), runs);
  });
});

type Op = "play" | "pause" | "resume" | "stop" | "speed" | "tick";
describe("player properties", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const ops = fc.array(fc.constantFrom<Op>("play", "pause", "resume", "stop", "speed", "tick"), { maxLength: 30 });
  it("SP-16 [S-34, S-38] random operations never throw; stop leaves nothing active", () => {
    fc.assert(fc.property(trees, ops, fc.double({ min: -5, max: 5, noNaN: true }), (tree, sequence, speed) => {
      const ctx = new MockAudioContext();
      const player = createPlayer(ctx.asContext());
      player.onEvent(() => undefined);
      const events = sonifyTree(tree).slice(0, 20);
      const act: Record<Op, () => void> = {
        play: () => player.play(events), pause: () => player.pause(), resume: () => player.resume(),
        stop: () => player.stop(), speed: () => player.setSpeed(speed),
        tick: () => { ctx.currentTime += 0.5; vi.advanceTimersByTime(500); },
      };
      sequence.forEach((op) => act[op]());
      player.stop();
      const counts = ctx.oscillators.map((o) => o.stopTimes.length);
      player.stop();
      return ctx.activeOscillators().length === 0 && counts.every((c, i) => c === ctx.oscillators[i].stopTimes.length);
    }), runs);
  });
  it("SP-17 [S-32] start times follow offset / speed and peaks stay at or below 0.4", () => {
    fc.assert(fc.property(trees, fc.double({ min: 0.5, max: 2, noNaN: true }), (tree, speed) => {
      const ctx = new MockAudioContext();
      const player = createPlayer(ctx.asContext());
      player.setSpeed(speed);
      const events = sonifyTree(tree).filter((e) => e.timbre !== "try").slice(0, 30);
      player.play(events);
      const timed = ctx.oscillators.every((o, i) => Math.abs((o.startTime as number) - (0.05 + events[i].startOffsetMs / 1000 / speed)) < 1e-9);
      const pitched = ctx.oscillators.every((o, i) => o.frequency.calls[0].value === events[i].frequencyHz);
      const peaks = ctx.gains.every((g) => g.gain.calls.every((c) => c.value <= 0.4));
      return timed && pitched && peaks;
    }), runs);
  });
});
