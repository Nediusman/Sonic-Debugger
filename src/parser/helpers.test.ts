import { describe, expect, it } from "vitest";
import { describeNode, firstChild, nextSibling, nodeAtLine, parent, previousSibling } from "./index";
import { sampleTree as tree } from "./fixtures/trees";
import type { TreeNode } from "../shared/types";

const n = (id: string): TreeNode => tree.nodes[id];

describe("navigation helpers on a literal tree", () => {
  it("relations", () => {
    expect(parent(tree, "n00000")).toBeNull();
    expect(parent(tree, "n00002")?.id).toBe("n00001");
    expect(firstChild(tree, "n00000")?.id).toBe("n00001");
    expect(firstChild(tree, "n00006")).toBeNull();
    expect(nextSibling(tree, "n00001")?.id).toBe("n00004");
    expect(nextSibling(tree, "n00004")).toBeNull();
    expect(previousSibling(tree, "n00004")?.id).toBe("n00001");
    expect(previousSibling(tree, "n00001")).toBeNull();
  });

  it("unknown ids, including prototype names, give null", () => {
    for (const id of ["zzz", "", "constructor", "__proto__", "toString"]) {
      expect(parent(tree, id)).toBeNull();
      expect(firstChild(tree, id)).toBeNull();
      expect(nextSibling(tree, id)).toBeNull();
      expect(previousSibling(tree, id)).toBeNull();
    }
  });

  it("nodeAtLine", () => {
    expect(nodeAtLine(tree, 10)?.id).toBe("n00006");
    expect(nodeAtLine(tree, 9)?.id).toBe("n00005");
    expect(nodeAtLine(tree, 7)?.id).toBe("n00000");
    expect(nodeAtLine(tree, 3)?.id).toBe("n00002");
    expect(nodeAtLine(tree, 0)).toBeNull();
    expect(nodeAtLine(tree, 13)).toBeNull();
    expect(nodeAtLine(tree, 1.5)).toBeNull();
    expect(nodeAtLine(tree, Number.NaN)).toBeNull();
  });

  it("describeNode follows Table P-2", () => {
    expect(describeNode(tree, n("n00000"))).toBe("module, 12 lines");
    expect(describeNode(tree, n("n00001"))).toBe("class Shop, 2 methods, 6 lines");
    expect(describeNode(tree, n("n00002"))).toBe("method add, 2 parameters, 3 lines");
    expect(describeNode(tree, n("n00003"))).toBe("method total, 1 parameter, 2 lines");
    expect(describeNode(tree, n("n00004"))).toBe("function main, 0 parameters, 5 lines");
    expect(describeNode(tree, n("n00005"))).toBe("loop, 3 lines");
    expect(describeNode(tree, n("n00006"))).toBe("call print");
  });

  it("describes the remaining kinds", () => {
    const base = { depth: 1, startCol: 0, endCol: 0, parentId: "n00000", childIds: [] };
    const d = (kind: TreeNode["kind"], name?: string, endLine = 1): string =>
      describeNode(tree, { id: "x", kind, ...(name ? { name } : {}), startLine: 4, endLine: 4 + endLine - 1, ...base });
    expect(d("conditional", "if", 2)).toBe("if, 2 lines");
    expect(d("conditional", "elif")).toBe("else if, 1 line");
    expect(d("conditional", "else")).toBe("else, 1 line");
    expect(d("try")).toBe("try block, 1 line");
    expect(d("call")).toBe("call");
    expect(d("assignment", "total")).toBe("assignment to total, line 4");
    expect(d("assignment")).toBe("assignment, line 4");
    expect(d("return")).toBe("return, line 4");
    expect(d("import", "os")).toBe("import os");
    expect(d("other", "with", 3)).toBe("with statement, 3 lines");
  });
});
