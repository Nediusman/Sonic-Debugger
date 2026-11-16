import { describe, expect, it } from "vitest";
import type { CodeTree, NavAction, NavState } from "../shared/types";
import { announce, createNavState, intentToAction, navigate, positionOf, rebaseState, visibleNodeIds } from "./index";
import { leafOnlyTree, sampleTree } from "./fixtures/trees";

const t = sampleTree;
const start = createNavState(t);
const act = (state: NavState, type: NavAction["type"]) => navigate(t, state, { type } as NavAction);
const focusOn = (focusId: string, expandedIds: string[] = ["n0"]): NavState => ({ focusId, expandedIds, errorNodeId: null });

describe("positionOf (N-1)", () => {
  it("gives root 1 of 1 at level 1", () => {
    expect(positionOf(t, "n0")).toEqual({ nodeId: "n0", index: 1, total: 1, level: 1 });
  });
  it("gives index among siblings and level", () => {
    expect(positionOf(t, "n4")).toEqual({ nodeId: "n4", index: 2, total: 2, level: 2 });
    expect(positionOf(t, "n6")).toEqual({ nodeId: "n6", index: 1, total: 1, level: 4 });
  });
});

describe("createNavState (N-15)", () => {
  it("expands only the root and focuses it", () => {
    expect(start).toEqual({ focusId: "n0", expandedIds: ["n0"], errorNodeId: null });
  });
  it("expands nothing for a root without children", () => {
    expect(createNavState(leafOnlyTree).expandedIds).toEqual([]);
  });
  it("ignores an error id that is not in the tree", () => {
    expect(createNavState(t, "zzz").errorNodeId).toBeNull();
  });
});

describe("visibleNodeIds (N-2)", () => {
  it("lists only the root and its children at first", () => {
    expect(visibleNodeIds(t, start)).toEqual(["n0", "n1", "n4"]);
  });
  it("lists pre-order when everything is open", () => {
    const all = { ...start, expandedIds: ["n0", "n1", "n4", "n5"] };
    expect(visibleNodeIds(t, all)).toEqual(["n0", "n1", "n2", "n3", "n4", "n5", "n6"]);
  });
});

describe("next and previous (N-3, N-4)", () => {
  it("moves and announces", () => {
    const r = act(start, "next");
    expect(r.moved).toBe(true);
    expect(r.state.focusId).toBe("n1");
    expect(r.message).toBe(announce(r.position, t));
  });
  it("stops at the end", () => {
    const r = act(focusOn("n4"), "next");
    expect(r).toMatchObject({ moved: false, message: "End of structure" });
    expect(r.state.focusId).toBe("n4");
  });
  it("stops at the start", () => {
    expect(act(start, "previous")).toMatchObject({ moved: false, message: "Start of structure" });
  });
  it("first and last jump to the ends", () => {
    expect(act(focusOn("n1"), "first").state.focusId).toBe("n0");
    expect(act(start, "last").state.focusId).toBe("n4");
  });
});

describe("expand and collapse (N-5, N-6)", () => {
  it("expands with a count", () => {
    const r = act(focusOn("n1"), "expand");
    expect(r).toMatchObject({ moved: false, message: "Expanded, 2 items" });
    expect(r.state.expandedIds).toEqual(["n0", "n1"]);
  });
  it("uses the singular for one child", () => {
    expect(act(focusOn("n4"), "expand").message).toBe("Expanded, 1 item");
  });
  it("reports already expanded and no items", () => {
    expect(act(start, "expand").message).toBe("Already expanded");
    expect(act(focusOn("n2", ["n0", "n1"]), "expand").message).toBe("No items inside");
  });
  it("collapses", () => {
    const r = act(start, "collapse");
    expect(r).toMatchObject({ moved: false, message: "Collapsed" });
    expect(r.state.expandedIds).toEqual([]);
  });
  it("reports already collapsed", () => {
    expect(act(focusOn("n1"), "collapse").message).toBe("Already collapsed");
    expect(act(focusOn("n2", ["n0", "n1"]), "collapse").message).toBe("Already collapsed");
  });
  it("collapse after expand returns to the starting state", () => {
    const opened = act(focusOn("n1"), "expand").state;
    expect(act(opened, "collapse").state).toEqual(focusOn("n1"));
  });
});

describe("parentNode and firstChildNode (N-7, N-8)", () => {
  it("moves to the parent", () => {
    expect(act(focusOn("n1"), "parentNode")).toMatchObject({ moved: true });
    expect(act(focusOn("n1"), "parentNode").state.focusId).toBe("n0");
  });
  it("stays at the root", () => {
    expect(act(start, "parentNode")).toMatchObject({ moved: false, message: "Top of structure" });
  });
  it("moves into an expanded node", () => {
    expect(act(start, "firstChildNode").state.focusId).toBe("n1");
  });
  it("expands a collapsed node and moves in", () => {
    const r = act(focusOn("n1"), "firstChildNode");
    expect(r.state.focusId).toBe("n2");
    expect(r.state.expandedIds).toEqual(["n0", "n1"]);
  });
  it("reports a leaf", () => {
    expect(act(focusOn("n2", ["n0", "n1"]), "firstChildNode").message).toBe("No items inside");
  });
});

describe("goToLine (N-9, N-10)", () => {
  const go = (line: number) => navigate(t, start, { type: "goToLine", line });
  it("focuses the deepest node and opens its ancestors", () => {
    const r = go(10);
    expect(r.state.focusId).toBe("n6");
    expect(r.state.expandedIds).toEqual(["n0", "n4", "n5"]);
    expect(r.moved).toBe(true);
  });
  it("rejects lines outside the file", () => {
    expect(go(13)).toMatchObject({ moved: false, message: "Line 13 is outside the file, which has 12 lines" });
    expect(go(0).message).toBe("Line 0 is outside the file, which has 12 lines");
    expect(go(13).state).toEqual(start);
  });
  it("rejects non-integers", () => {
    expect(go(2.5).message).toBe("Enter a whole line number");
    expect(go(NaN).message).toBe("Enter a whole line number");
  });
});

describe("goToError (N-11)", () => {
  it("says so when there is no error", () => {
    expect(act(start, "goToError")).toMatchObject({ moved: false, message: "No error to go to. Run the code first." });
  });
  it("focuses the failing node and opens ancestors", () => {
    const r = act({ ...start, errorNodeId: "n3" }, "goToError");
    expect(r.state.focusId).toBe("n3");
    expect(r.state.expandedIds).toEqual(["n0", "n1"]);
    expect(r.message).toBe("method total, 1 parameter, 2 lines, item 2 of 2, level 3");
  });
});

describe("robustness (N-12)", () => {
  it("does not mutate its inputs", () => {
    const state = Object.freeze({ ...start, expandedIds: Object.freeze([...start.expandedIds]) as string[] });
    expect(() => navigate(t, state, { type: "expand" })).not.toThrow();
  });
  it("repairs a state that points at a hidden node", () => {
    expect(act(focusOn("n2"), "next").state.focusId).toBe("n1");
  });
});

describe("rebaseState (N-14)", () => {
  const edited: CodeTree = leafOnlyTree;
  it("falls back to the root when the new tree is smaller", () => {
    const r = rebaseState(t, { focusId: "n6", expandedIds: ["n0", "n4", "n5"], errorNodeId: "n6" }, edited);
    expect(r).toEqual({ focusId: "n0", expandedIds: [], errorNodeId: null });
  });
  it("keeps focus on the same line and opens its ancestors", () => {
    const r = rebaseState(t, { focusId: "n6", expandedIds: ["n0"], errorNodeId: null }, t);
    expect(r.focusId).toBe("n6");
    expect(r.expandedIds).toEqual(["n0", "n4", "n5"]);
  });
});

describe("announce (N-16)", () => {
  it("builds on describeNode", () => {
    expect(announce(positionOf(t, "n4"), t)).toBe("function main, 0 parameters, 5 lines, item 2 of 2, level 2");
  });
});

describe("intentToAction (table in design.md)", () => {
  const to = (focus: string, expanded: string[], intent: Parameters<typeof intentToAction>[2]) =>
    intentToAction(t, focusOn(focus, expanded), intent).type;
  it("maps ArrowRight", () => {
    expect(to("n1", ["n0"], "expandOrDescend")).toBe("expand");
    expect(to("n0", ["n0"], "expandOrDescend")).toBe("firstChildNode");
    expect(to("n2", ["n0", "n1"], "expandOrDescend")).toBe("firstChildNode");
  });
  it("maps ArrowLeft", () => {
    expect(to("n0", ["n0"], "collapseOrAscend")).toBe("collapse");
    expect(to("n1", ["n0"], "collapseOrAscend")).toBe("parentNode");
    expect(to("n2", ["n0", "n1"], "collapseOrAscend")).toBe("parentNode");
  });
  it("passes plain intents through", () => {
    expect(to("n0", [], "next")).toBe("next");
  });
});
