import type { CodeTree, TreeNode } from "../../shared/types";

type Spec = Partial<TreeNode> & Pick<TreeNode, "id" | "kind" | "startLine" | "endLine">;

function node(spec: Spec): TreeNode {
  return { depth: 0, startCol: 0, endCol: 0, parentId: null, childIds: [], ...spec };
}

/** module(1-12) > class Shop(1-6) > method add(2-4), method total(5-6); function main(8-12) > loop(9-11) > call print(10). */
export const sampleTree: CodeTree = {
  rootId: "n0",
  issues: [],
  nodes: {
    n0: node({ id: "n0", kind: "module", startLine: 1, endLine: 12, childIds: ["n1", "n4"] }),
    n1: node({ id: "n1", kind: "class", name: "Shop", depth: 1, startLine: 1, endLine: 6, parentId: "n0", childIds: ["n2", "n3"] }),
    n2: node({ id: "n2", kind: "method", name: "add", depth: 2, startLine: 2, endLine: 4, parentId: "n1", parameterCount: 2 }),
    n3: node({ id: "n3", kind: "method", name: "total", depth: 2, startLine: 5, endLine: 6, parentId: "n1", parameterCount: 1 }),
    n4: node({ id: "n4", kind: "function", name: "main", depth: 1, startLine: 8, endLine: 12, parentId: "n0", parameterCount: 0, childIds: ["n5"] }),
    n5: node({ id: "n5", kind: "loop", depth: 2, startLine: 9, endLine: 11, parentId: "n4", childIds: ["n6"] }),
    n6: node({ id: "n6", kind: "call", name: "print", depth: 3, startLine: 10, endLine: 10, parentId: "n5" }),
  },
};

/** A module with a single line and no children. */
export const leafOnlyTree: CodeTree = {
  rootId: "n0",
  issues: [],
  nodes: { n0: node({ id: "n0", kind: "module", startLine: 1, endLine: 1 }) },
};
