import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parse } from "./index";
import { anySource, program } from "./grammar";

describe("parser determinism (P-10, P-26)", () => {
  it("PR-8 parsing twice gives deep-equal trees", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(anySource, program.map((p) => p.source)), async (source) => {
        expect(await parse(source)).toStrictEqual(await parse(source));
      }),
      { numRuns: 200 },
    );
  });

  it("parses 1,000 lines within 500 ms after the first call", async () => {
    const source = "def f(a, b):\n    if a:\n        return b\n    x = 1\n".repeat(250);
    await parse("x = 1");
    const start = performance.now();
    const tree = await parse(source);
    expect(performance.now() - start).toBeLessThan(500);
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(500);
  });

  it("parses a 5,000 line file", async () => {
    const tree = await parse("x = 1\n".repeat(5000));
    expect(Object.keys(tree.nodes)).toHaveLength(5001);
  });
});
