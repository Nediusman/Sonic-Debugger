import { describe, expect, it } from "vitest";
import type { NodeKind } from "../shared/types";
import { describeOverview, describeSoundEvent, sonifyError, sonifyNode, sonifyTree } from "./index";
import { depthFrequency } from "./mapping/pitch";
import { round2, sortEvents } from "./mapping/order";
import { bigTree, emptyTree, flatTree, kindTrees, nestedTree, wideTree } from "./fixtures/trees";

describe("pitch (S-1, S-2)", () => {
  const expected = [130.81, 146.83, 164.81, 195.99, 220, 261.62, 293.66, 329.62, 391.99, 439.99, 523.24, 587.32, 659.24, 783.97, 879.98, 879.98];
  it.each(expected.map((hz, depth) => [depth, hz]))("depth %i gives %f Hz", (depth, hz) => {
    expect(depthFrequency(depth)).toBe(hz);
  });
  it("caps at the depth-14 value", () => expect(depthFrequency(99)).toBe(879.98));
});

describe("round2 and sort", () => {
  it("rounds to two decimals", () => expect(round2(1.006)).toBe(1.01));
  it("sorts by offset, node id, then frequency", () => {
    const e = (nodeId: string, startOffsetMs: number, frequencyHz: number) =>
      ({ nodeId, startOffsetMs, durationMs: 1, frequencyHz, timbre: "call" as const, gain: 0.25, stereoPan: 0 });
    const sorted = sortEvents([e("b", 0, 1), e("a", 5, 1), e("a", 0, 9), e("a", 0, 2)]);
    expect(sorted.map((x) => [x.nodeId, x.startOffsetMs, x.frequencyHz])).toEqual([["a", 0, 2], ["a", 0, 9], ["b", 0, 1], ["a", 5, 1]]);
  });
});

describe("timbre table rows (S-3 to S-10, Q-S1)", () => {
  const own = (kind: NodeKind) => {
    const tree = kindTrees[kind];
    const id = kind === "module" ? tree.rootId : Object.keys(tree.nodes).find((k) => tree.nodes[k].kind === kind) as string;
    return sonifyTree(tree).filter((e) => e.nodeId === id);
  };
  it("single-event kinds use the kind as timbre and noteMs", () => {
    for (const kind of ["class", "function", "method", "try", "call"] as const) {
      const events = own(kind);
      expect(events).toHaveLength(1);
      expect(events[0].timbre).toBe(kind);
      expect(events[0].gain).toBe(0.25);
    }
  });
  it("loop: three pulses 110 ms apart at the node pitch", () => {
    const e = own("loop");
    expect(e.map((x) => x.startOffsetMs - e[0].startOffsetMs)).toEqual([0, 110, 220]);
    expect(new Set(e.map((x) => x.frequencyHz)).size).toBe(1);
  });
  it("if rises a fifth, else falls", () => {
    const [a, b] = own("conditional");
    expect(a.frequencyHz).toBe(depthFrequency(1));
    expect(b.frequencyHz).toBe(round2(depthFrequency(1) * 2 ** (7 / 12)));
    const elseTree = sonifyNode(nestedTree, "n00009").filter((x) => x.nodeId === "n00009");
    expect(nestedTree.nodes.n00009.name).toBe("else");
    expect(elseTree[0].frequencyHz).toBeGreaterThan(elseTree[1].frequencyHz);
  });
  it("return falls by a major third", () => {
    const [a, b] = own("return");
    expect(b.frequencyHz).toBeLessThan(a.frequencyHz);
    expect(b.startOffsetMs).toBeGreaterThan(a.startOffsetMs);
  });
  it("import: two sines, octave apart, 120 ms, together", () => {
    const [a, b] = own("import");
    expect([a.startOffsetMs, a.durationMs]).toEqual([b.startOffsetMs, 120]);
    expect(b.frequencyHz).toBe(round2(a.frequencyHz * 2));
  });
  it("assignment 30 ms, other 20 ms", () => {
    expect(own("assignment")[0].durationMs).toBe(30);
    expect(own("other")[0].durationMs).toBe(20);
  });
  it("module root has pan 0 and the base pitch", () => {
    expect(own("module")[0]).toMatchObject({ stereoPan: 0, frequencyHz: 130.81 });
  });
});

describe("overview layout (S-11 to S-15, S-30)", () => {
  it("empty tree returns the root event", () => expect(sonifyTree(emptyTree)).toHaveLength(1));
  it("flat tree: pans -0.8, 0, 0.8 and source order", () => {
    const events = sonifyTree(flatTree);
    expect(new Set(events.filter((e) => e.nodeId !== flatTree.rootId).map((e) => e.stereoPan))).toEqual(new Set([-0.8, 0, 0.8]));
  });
  it("small tree uses 220 ms notes and a plain description", () => {
    expect(describeOverview(flatTree)).toBe("Overview: 4 constructs, about 1 seconds");
  });
  it("limits wide trees to depth <= 2 and says so", () => {
    expect(describeOverview(wideTree)).toBe("overview limited to top-level constructs, 200 in total");
    const events = sonifyTree(wideTree);
    expect(Math.max(...events.map((e) => e.startOffsetMs + e.durationMs))).toBeLessThanOrEqual(10000);
  });
  it("299-node tree stays within 10 s", () => {
    expect(Math.max(...sonifyTree(bigTree).map((e) => e.startOffsetMs + e.durationMs))).toBeLessThanOrEqual(10000);
    expect(describeOverview(bigTree)).toBe("overview limited to top-level constructs, 299 in total");
  });
});

describe("error cue (S-19, S-21)", () => {
  it("returns the exact tritone", () => {
    const [sine, saw] = sonifyError(nestedTree, 3);
    expect(sine).toMatchObject({ frequencyHz: 311.13, timbre: "error-sine", durationMs: 600, gain: 0.4, startOffsetMs: 0 });
    expect(saw).toMatchObject({ frequencyHz: 440, timbre: "error-saw", durationMs: 600, gain: 0.4, startOffsetMs: 0 });
  });
  it("targets the innermost node, or the root off the end", () => {
    expect(sonifyError(nestedTree, 5)[0].nodeId).toBe("n00004");
    expect(sonifyError(nestedTree, 9999)[0].nodeId).toBe(nestedTree.rootId);
  });
  it("reduced: gain 0.2, 300 ms", () => {
    expect(sonifyError(nestedTree, 1, { reducedSound: true })[0]).toMatchObject({ gain: 0.2, durationMs: 300 });
  });
});

describe("focus mode (S-22, S-23)", () => {
  it("plays the node then its descendants from 0 ms at 220 ms notes", () => {
    const events = sonifyNode(nestedTree, "n00004");
    expect(events[0]).toMatchObject({ nodeId: "n00004", startOffsetMs: 0, durationMs: 220 });
    expect(new Set(events.map((e) => e.nodeId))).toEqual(new Set(["n00004", "n00005", "n00006", "n00007", "n00008", "n00009", "n00010", "n00011"]));
  });
  it("unknown id gives []", () => expect(sonifyNode(nestedTree, "nope")).toEqual([]));
});

describe("reduced sound (S-17)", () => {
  it("halves duration and gain", () => {
    const full = sonifyTree(nestedTree);
    const reduced = sonifyTree(nestedTree, { reducedSound: true });
    reduced.forEach((e, i) => {
      expect(e.durationMs).toBe(round2(full[i].durationMs / 2));
      expect(e.gain).toBe(round2(full[i].gain / 2));
    });
  });
});

describe("describeSoundEvent (S-29)", () => {
  it("mentions the construct, hertz and side", () => {
    const text = describeSoundEvent(sonifyTree(flatTree)[1], flatTree);
    expect(text).toMatch(/import/);
    expect(text).toMatch(/hertz, left$/);
  });
  it("names the error cue", () => {
    expect(describeSoundEvent(sonifyError(flatTree, 2)[0], flatTree)).toMatch(/^error cue/);
  });
});
