import type { CodeTree, NodeKind, TreeNode } from "../shared/types";

export const LEGEND_KINDS: readonly NodeKind[] = [
  "module", "class", "function", "method", "loop", "conditional", "try", "call", "assignment", "return", "import",
];

const CHILD_KINDS = LEGEND_KINDS.filter((kind) => kind !== "module");

function legendNode(kind: NodeKind, index: number): TreeNode {
  const isRoot = kind === "module";
  return {
    id: `legend-${kind}`,
    kind,
    ...(kind === "function" || kind === "method" ? { name: "example", parameterCount: 0 } : {}),
    depth: isRoot ? 0 : 1,
    startLine: index + 1,
    endLine: index + 1,
    startCol: 0,
    endCol: 0,
    parentId: isRoot ? null : "legend-module",
    childIds: isRoot ? CHILD_KINDS.map((k) => `legend-${k}`) : [],
  };
}

/** One node per sound-producing kind, all at depth 1 under a module (A-U6). */
export const LEGEND_TREE: CodeTree = {
  rootId: "legend-module",
  issues: [],
  nodes: Object.fromEntries(LEGEND_KINDS.map((kind, i) => [`legend-${kind}`, legendNode(kind, i)])),
};
