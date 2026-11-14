import { afterAll, describe, expect, it } from "vitest";
import { configureParser, parse } from "./index";
import { LOAD_FAILURE_MESSAGE } from "./parse";
import { nodeLoader } from "./loader.node";

describe("load failure path (P-25)", () => {
  afterAll(() => configureParser(nodeLoader));

  it("returns a root-only tree with the fixed message, then retries", async () => {
    let fail = true;
    configureParser({
      runtime: () => (fail ? Promise.reject(new Error("no wasm")) : nodeLoader.runtime()),
      grammar: () => nodeLoader.grammar(),
    });
    const broken = await parse("x = 1\ny = 2");
    expect(Object.keys(broken.nodes)).toEqual(["n00000"]);
    expect(broken.nodes.n00000.endLine).toBe(2);
    expect(broken.issues).toEqual([{ line: 1, column: 0, message: LOAD_FAILURE_MESSAGE }]);
    fail = false;
    const healthy = await parse("x = 1");
    expect(healthy.issues).toEqual([]);
    expect(Object.keys(healthy.nodes)).toHaveLength(2);
  });

  it("shares one initialisation between concurrent calls (P-23)", async () => {
    let runtimeCalls = 0;
    configureParser({
      runtime: () => { runtimeCalls++; return nodeLoader.runtime(); },
      grammar: () => nodeLoader.grammar(),
    });
    await Promise.all([parse("a"), parse("b"), parse("c")]);
    expect(runtimeCalls).toBeLessThanOrEqual(1);
  });
});
