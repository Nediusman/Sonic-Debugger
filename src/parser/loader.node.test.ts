import { describe, expect, it } from "vitest";
import { Language, Parser } from "web-tree-sitter";
import { nodeLoader } from "./loader.node";

describe("P-T1 WASM loads in Node", () => {
  it("parses x = 1 and the root is module", async () => {
    await Parser.init({ wasmBinary: (await nodeLoader.runtime()) as Uint8Array });
    const language = await Language.load((await nodeLoader.grammar()) as Uint8Array);
    expect(language.abiVersion).toBeGreaterThan(0);
    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse("x = 1");
    expect(tree?.rootNode.type).toBe("module");
    expect(tree?.rootNode.hasError).toBe(false);
    tree?.delete();
    parser.delete();
  });
});
