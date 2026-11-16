import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { describeNode, nodeAtLine } from "../parser";
import type { CodeTree, NavAction, NavState } from "../shared/types";
import { announce, createNavState, createSpeaker, keyToCommand, navigate, positionOf, rebaseState, visibleNodeIds } from "./index";
import { actionArb, keyArb, stateFrom, stateSeedArb, treeAndStateArb, treeArb } from "./fixtures/arbitraries";
import { KEY_MAP, RESERVED_CODES } from "./keys/keymap";
import { ancestorIds, hasChildren } from "./model/tree";
import { FakeSynth } from "./fixtures/fakes";
import { render } from "./fixtures/render";

const runs = { numRuns: 250 };

function preOrder(tree: CodeTree, id: string): string[] {
  return [id, ...tree.nodes[id].childIds.flatMap((c) => preOrder(tree, c))];
}

function isValid(tree: CodeTree, state: NavState): boolean {
  return (
    visibleNodeIds(tree, state).includes(state.focusId) &&
    state.expandedIds.every((id) => Object.hasOwn(tree.nodes, id) && hasChildren(tree, id))
  );
}

describe("NV-1 positionOf (N-1)", () => {
  it("keeps 1 <= index <= total and level = depth + 1", () => {
    fc.assert(
      fc.property(treeArb, (tree) => {
        for (const id of Object.keys(tree.nodes)) {
          const p = positionOf(tree, id);
          if (!(p.index >= 1 && p.index <= p.total && p.level === tree.nodes[id].depth + 1)) return false;
        }
        const root = positionOf(tree, tree.rootId);
        return root.index === 1 && root.total === 1 && root.level === 1;
      }),
      runs,
    );
  });
});

describe("NV-2 visibleNodeIds (N-2)", () => {
  it("is pre-order and omits descendants of collapsed nodes", () => {
    fc.assert(
      fc.property(treeAndStateArb, ({ tree, state }) => {
        const visible = visibleNodeIds(tree, state);
        const expected = preOrder(tree, tree.rootId).filter((id) => {
          for (let p = tree.nodes[id].parentId; p !== null; p = tree.nodes[p].parentId) {
            if (!state.expandedIds.includes(p)) return false;
          }
          return true;
        });
        return JSON.stringify(visible) === JSON.stringify(expected);
      }),
      runs,
    );
  });
});

describe("NV-3 walking next and previous (N-3, N-4)", () => {
  it("visits every visible node once, then reports the end", () => {
    fc.assert(
      fc.property(treeAndStateArb, ({ tree, state }) => {
        const visible = visibleNodeIds(tree, state);
        let s = navigate(tree, state, { type: "first" }).state;
        const seen = [s.focusId];
        for (;;) {
          const r = navigate(tree, s, { type: "next" });
          if (!r.moved) {
            expect(r.message).toBe("End of structure");
            break;
          }
          s = r.state;
          seen.push(s.focusId);
        }
        expect(seen).toEqual(visible);
        for (let i = visible.length - 1; i > 0; i--) {
          s = navigate(tree, s, { type: "previous" }).state;
          expect(s.focusId).toBe(visible[i - 1]);
        }
        const top = navigate(tree, s, { type: "previous" });
        return !top.moved && top.message === "Start of structure";
      }),
      runs,
    );
  });
  it("next then previous returns to the same node from any non-last node", () => {
    fc.assert(
      fc.property(treeAndStateArb, ({ tree, state }) => {
        const visible = visibleNodeIds(tree, state);
        fc.pre(state.focusId !== visible[visible.length - 1]);
        const there = navigate(tree, state, { type: "next" }).state;
        return navigate(tree, there, { type: "previous" }).state.focusId === state.focusId;
      }),
      runs,
    );
  });
  it("collapse after expand returns to the starting state", () => {
    fc.assert(
      fc.property(treeAndStateArb, ({ tree, state }) => {
        fc.pre(hasChildren(tree, state.focusId) && !state.expandedIds.includes(state.focusId));
        const opened = navigate(tree, state, { type: "expand" }).state;
        return JSON.stringify(navigate(tree, opened, { type: "collapse" }).state) === JSON.stringify(state);
      }),
      runs,
    );
  });
});

describe("NV-4 goToLine (N-9)", () => {
  it("focuses a visible node whose range contains the line", () => {
    fc.assert(
      fc.property(treeAndStateArb, fc.nat({ max: 1000 }), ({ tree, state }, pick) => {
        const lineCount = tree.nodes[tree.rootId].endLine;
        const line = (pick % lineCount) + 1;
        const r = navigate(tree, state, { type: "goToLine", line });
        const node = tree.nodes[r.state.focusId];
        return (
          node.startLine <= line && line <= node.endLine &&
          r.state.focusId === nodeAtLine(tree, line)?.id &&
          visibleNodeIds(tree, r.state).includes(r.state.focusId)
        );
      }),
      runs,
    );
  });
});

describe("NV-5 and NV-6 action sequences (N-12, N-13)", () => {
  it("keeps the state valid, never throws, never mutates", () => {
    fc.assert(
      fc.property(treeAndStateArb, fc.array(actionArb, { maxLength: 200 }), ({ tree, state }, actions) => {
        const treeBefore = JSON.stringify(tree);
        let s = state;
        for (const action of actions) {
          const before = JSON.stringify(s);
          const r = navigate(tree, s, action);
          if (JSON.stringify(s) !== before || !isValid(tree, r.state) || r.message === "") return false;
          if (r.moved !== (r.state.focusId !== s.focusId)) return false;
          s = r.state;
        }
        return JSON.stringify(tree) === treeBefore;
      }),
      runs,
    );
  });
  it("is deterministic", () => {
    fc.assert(
      fc.property(treeAndStateArb, actionArb, ({ tree, state }, action: NavAction) => {
        expect(navigate(tree, state, action)).toEqual(navigate(tree, state, action));
      }),
      runs,
    );
  });
});

describe("NV-7 rebaseState (N-14)", () => {
  it("returns a valid state for any pair of trees", () => {
    fc.assert(
      fc.property(treeAndStateArb, treeArb, ({ tree, state }, other) => {
        const r = rebaseState(tree, state, other);
        const line = tree.nodes[state.focusId].startLine;
        const target = nodeAtLine(other, line)?.id ?? other.rootId;
        return isValid(other, r) && r.focusId === target && ancestorIds(other, target).every((a) => r.expandedIds.includes(a));
      }),
      runs,
    );
  });
});

describe("NV-8 announce (N-16)", () => {
  it("starts with describeNode, ends with the position, is one clean line", () => {
    fc.assert(
      fc.property(treeArb, (tree) => {
        for (const id of Object.keys(tree.nodes)) {
          const p = positionOf(tree, id);
          const text = announce(p, tree);
          const expected = `${describeNode(tree, tree.nodes[id])}, item ${p.index} of ${p.total}, level ${p.level}`;
          if (text !== expected || /[\n\r`*#<>{}[\]|\\]/.test(text)) return false;
        }
        return true;
      }),
      runs,
    );
  });
});

describe("NV-9 keyToCommand (N-19, N-20)", () => {
  it("returns null for modifiers and reserved codes, and for codes outside the map", () => {
    fc.assert(
      fc.property(keyArb, (event) => {
        const result = keyToCommand(event);
        const modified = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
        const shiftSlash = event.code === "Slash" && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
        if (RESERVED_CODES.includes(event.code)) return result === null;
        if (shiftSlash) return result?.kind === "app";
        if (modified) return result === null;
        if (!Object.hasOwn(KEY_MAP, event.code)) return result === null;
        return result !== null;
      }),
      runs,
    );
  });
  it("is pure", () => {
    fc.assert(fc.property(keyArb, (e) => { expect(keyToCommand(e)).toEqual(keyToCommand({ ...e })); }), runs);
  });
});

describe("NV-10 rendered markup (N-28, N-29)", () => {
  it("matches the model, has one tab stop, and omits collapsed children", () => {
    fc.assert(
      fc.property(treeAndStateArb, ({ tree, state }) => {
        const { items } = render(tree, state);
        const visible = visibleNodeIds(tree, state);
        if (items.map((i) => i.id).join() !== visible.map((id) => `ti-${id}`).join()) return false;
        if (items.filter((i) => i.attrs.tabindex === "0").length !== 1) return false;
        return items.every((item, i) => {
          const id = visible[i];
          const p = positionOf(tree, id);
          const a = item.attrs;
          const expanded = hasChildren(tree, id) ? String(state.expandedIds.includes(id)) : undefined;
          return (
            a["aria-level"] === String(p.level) && a["aria-setsize"] === String(p.total) &&
            a["aria-posinset"] === String(p.index) && a["aria-expanded"] === expanded &&
            (a.tabindex === "0") === (id === state.focusId)
          );
        });
      }),
      runs,
    );
  });
});

describe("NV-11 speaker (N-39)", () => {
  const op = fc.oneof(
    fc.boolean().map((on) => ({ type: "enable" as const, on })),
    fc.string().map((text) => ({ type: "speak" as const, text })),
    fc.constant({ type: "cancel" as const }),
  );
  it("never throws, never speaks while disabled, queues at most one", () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 60 }), (ops) => {
        const synth = new FakeSynth();
        const speaker = createSpeaker(synth);
        let enabled = false;
        for (const o of ops) {
          const spokenBefore = synth.spoken;
          if (o.type === "enable") { speaker.setEnabled(o.on); enabled = o.on; }
          else if (o.type === "speak") speaker.speak(o.text);
          else speaker.cancel();
          if (!enabled && synth.spoken !== spokenBefore) return false;
          if (synth.queue.length > 1) return false;
        }
        return true;
      }),
      runs,
    );
  });
});

describe("generator sanity", () => {
  it("starts from a valid state", () => {
    fc.assert(fc.property(treeArb, stateSeedArb, (tree, seed) => isValid(tree, stateFrom(tree, seed)) && isValid(tree, createNavState(tree))), runs);
  });
});
