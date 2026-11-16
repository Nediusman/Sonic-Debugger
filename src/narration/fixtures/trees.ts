import type { CodeTree, TreeNode } from "../../shared/types";

function node(partial: Partial<TreeNode> & Pick<TreeNode, "id" | "kind" | "startLine" | "endLine">): TreeNode {
  return { depth: 0, startCol: 0, endCol: 0, parentId: null, childIds: [], ...partial };
}

/** module(1-12) > function process(2-8) > loop(3-6) > call(4); function main(10-12). */
export const narrationTree: CodeTree = {
  rootId: "r",
  issues: [],
  nodes: {
    r: node({ id: "r", kind: "module", startLine: 1, endLine: 12, childIds: ["f", "m"] }),
    f: node({ id: "f", kind: "function", name: "process", depth: 1, startLine: 2, endLine: 8, parentId: "r", childIds: ["l"] }),
    l: node({ id: "l", kind: "loop", depth: 2, startLine: 3, endLine: 6, parentId: "f", childIds: ["c"] }),
    c: node({ id: "c", kind: "call", name: "print", depth: 3, startLine: 4, endLine: 4, parentId: "l" }),
    m: node({ id: "m", kind: "function", name: "main", depth: 1, startLine: 10, endLine: 12, parentId: "r" }),
  },
};

export const SOURCE_12 = [
  "import math",
  "def process(items):",
  "    for item in items:",
  "        print(total + item)",
  "        pass",
  "    pass",
  "    return 1",
  "",
  "",
  "def main():",
  "    process([1, 2])",
  "main()",
].join("\n");
