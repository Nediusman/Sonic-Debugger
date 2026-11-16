import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sonifyError, sonifyNode, sonifyTree } from "./index";
import { bigTree, nestedTree, wideTree } from "./fixtures/trees";

const dir = join(__dirname, "mapping");
const banned = [/Math\.random/, /\bDate\b/, /\bperformance\b/, /\bIntl\b/, /toLocale/, /\bprocess\b/];
const stripComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("determinism (S-25, S-26)", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  it("finds the mapping files", () => expect(files.length).toBeGreaterThan(5));
  it.each(files)("%s has no banned identifier", (file) => {
    const code = stripComments(readFileSync(join(dir, file), "utf8"));
    for (const pattern of banned) expect(code).not.toMatch(pattern);
  });
  it("two runs give byte-identical output", () => {
    for (const tree of [nestedTree, wideTree, bigTree]) {
      expect(JSON.stringify(sonifyTree(tree))).toBe(JSON.stringify(sonifyTree(tree)));
      expect(JSON.stringify(sonifyNode(tree, tree.rootId))).toBe(JSON.stringify(sonifyNode(tree, tree.rootId)));
      expect(JSON.stringify(sonifyError(tree, 3))).toBe(JSON.stringify(sonifyError(tree, 3)));
    }
  });
});
