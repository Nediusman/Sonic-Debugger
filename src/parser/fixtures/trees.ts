import type { CodeTree, TreeNode } from "../../shared/types";

function node(partial: Partial<TreeNode> & Pick<TreeNode, "id" | "kind" | "startLine" | "endLine">): TreeNode {
  return { depth: 0, startCol: 0, endCol: 0, parentId: null, childIds: [], ...partial };
}

/** module(1-12) > class Shop(1-6) > method add(2-4), method total(5-6); function main(8-12) > loop(9-11) > call print(10). */
export const sampleTree: CodeTree = {
  rootId: "n00000",
  issues: [],
  nodes: {
    n00000: node({ id: "n00000", kind: "module", startLine: 1, endLine: 12, childIds: ["n00001", "n00004"] }),
    n00001: node({ id: "n00001", kind: "class", name: "Shop", depth: 1, startLine: 1, endLine: 6, parentId: "n00000", childIds: ["n00002", "n00003"] }),
    n00002: node({ id: "n00002", kind: "method", name: "add", depth: 2, startLine: 2, endLine: 4, parentId: "n00001", parameterCount: 2 }),
    n00003: node({ id: "n00003", kind: "method", name: "total", depth: 2, startLine: 5, endLine: 6, parentId: "n00001", parameterCount: 1 }),
    n00004: node({ id: "n00004", kind: "function", name: "main", depth: 1, startLine: 8, endLine: 12, parentId: "n00000", parameterCount: 0, childIds: ["n00005"] }),
    n00005: node({ id: "n00005", kind: "loop", depth: 2, startLine: 9, endLine: 11, parentId: "n00004", childIds: ["n00006"] }),
    n00006: node({ id: "n00006", kind: "call", name: "print", depth: 3, startLine: 10, endLine: 10, parentId: "n00005" }),
  },
};
