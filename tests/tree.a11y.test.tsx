// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StructureTree, createNavState } from "../src/navigation";
import { sampleTree } from "../src/navigation/fixtures/trees";
import { THEMES, contrastRatio, type ThemeName } from "../src/ui/tokens";

afterEach(cleanup);

const noop = (): void => undefined;

async function violations(theme: ThemeName): Promise<string[]> {
  document.documentElement.dataset.theme = theme;
  const state = { ...createNavState(sampleTree), errorNodeId: "n3", expandedIds: ["n0", "n1", "n4"] };
  const { container } = render(
    <main>
      <h1>Test</h1>
      <StructureTree tree={sampleTree} state={state} onKeyCommand={noop} onItemFocus={noop} />
    </main>,
  );
  // jsdom has no layout or paint, so contrast is checked from the tokens instead (below).
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("StructureTree accessibility (N-T4, N-T13)", () => {
  for (const theme of ["default", "high-contrast"] as const) {
    it(`has no axe violations in the ${theme} theme`, async () => {
      expect(await violations(theme)).toEqual([]);
    });
    it(`focus ring has 3:1 contrast against the ${theme} backgrounds`, () => {
      const t = THEMES[theme];
      for (const bg of [t.bg, t.surface, t.controlBg]) expect(contrastRatio(t.focusRing, bg)).toBeGreaterThanOrEqual(3);
    });
  }
  it("exposes the ARIA tree pattern with one tab stop and a roving tabindex", () => {
    const { container } = render(
      <StructureTree tree={sampleTree} state={createNavState(sampleTree)} onKeyCommand={noop} onItemFocus={noop} />,
    );
    expect(container.querySelector('[role="tree"]')).not.toBeNull();
    const items = [...container.querySelectorAll('[role="treeitem"]')];
    expect(items.filter((i) => i.getAttribute("tabindex") === "0")).toHaveLength(1);
    for (const item of items) {
      for (const attr of ["aria-level", "aria-setsize", "aria-posinset", "aria-label"]) expect(item.hasAttribute(attr)).toBe(true);
    }
  });
});
