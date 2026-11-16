import { describe, expect, it } from "vitest";
import { announce, createNavState, positionOf, visibleNodeIds } from "./index";
import { render } from "./fixtures/render";
import { sampleTree } from "./fixtures/trees";

describe("StructureTree markup", () => {
  const state = createNavState(sampleTree);
  const { html, items } = render(sampleTree, state);
  it("uses the tree, treeitem and group roles", () => {
    expect(html).toContain('<ul role="tree" aria-label="Code structure"');
    expect(html).toContain('<ul role="group">');
    expect(items.every((i) => i.attrs.role === "treeitem")).toBe(true);
  });
  it("renders only visible items, in order", () => {
    expect(items.map((i) => i.id)).toEqual(visibleNodeIds(sampleTree, state).map((id) => `ti-${id}`));
  });
  it("sets level, size, position and name from the model", () => {
    const second = items[2];
    const p = positionOf(sampleTree, "n4");
    expect(second.attrs["aria-level"]).toBe(String(p.level));
    expect(second.attrs["aria-setsize"]).toBe(String(p.total));
    expect(second.attrs["aria-posinset"]).toBe(String(p.index));
    expect(second.attrs["aria-label"]).toBe(announce(p, sampleTree));
  });
  it("sets aria-expanded only on nodes with children", () => {
    expect(items[0].attrs["aria-expanded"]).toBe("true");
    expect(items[1].attrs["aria-expanded"]).toBe("false");
    const open = render(sampleTree, { ...state, expandedIds: ["n0", "n1"] }).items;
    expect(open[2].attrs["aria-expanded"]).toBeUndefined();
  });
  it("makes exactly the focused item tabbable", () => {
    const r = render(sampleTree, { ...state, focusId: "n4" }).items;
    expect(r.filter((i) => i.attrs.tabindex === "0").map((i) => i.id)).toEqual(["ti-n4"]);
    expect(r.filter((i) => i.attrs.tabindex === "-1")).toHaveLength(r.length - 1);
  });
  it("shows the text Error here on the error node and links it as description", () => {
    const r = render(sampleTree, { ...state, errorNodeId: "n4" });
    expect(r.html).toContain(">Error here</span>");
    expect(r.items[2].attrs["aria-describedby"]).toBe("ti-n4-error");
    expect(render(sampleTree, state).html).not.toContain("Error here");
  });
  it("shows the description as visible text", () => {
    expect(html).toContain(">module, 12 lines</span>");
  });
});
