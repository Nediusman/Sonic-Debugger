import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "tree", "StructureTree.css"), "utf8");

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("focus indicator (N-31)", () => {
  const rule = /\[role="treeitem"\]:focus\s*{([^}]*)}/.exec(css)?.[1] ?? "";
  it("is an outline at least 2 px thick with an offset", () => {
    expect(Number(/outline:\s*(\d+)px solid/.exec(rule)?.[1])).toBeGreaterThanOrEqual(2);
    expect(rule).toMatch(/outline-offset:\s*\d+px/);
  });
  it("has a fallback ring color with 3:1 contrast on the high-contrast black background", () => {
    const ring = /var\(--focus-ring,\s*(#[0-9a-fA-F]{6})\)/.exec(rule)?.[1] ?? "";
    expect(contrast(ring, "#000000")).toBeGreaterThanOrEqual(3);
  });
  it("adds an underline so focus is not shown by color alone", () => {
    expect(css).toMatch(/:focus > \.tree-label\s*{[^}]*underline/);
  });
});
