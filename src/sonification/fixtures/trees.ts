import type { CodeTree, NodeKind, TreeNode } from "../../shared/types";
export interface Spec {
  kind: NodeKind;
  name?: string;
  children?: Spec[];
}
export function leaf(kind: NodeKind, name?: string): Spec {
  return { kind, name };
}
export function branch(kind: NodeKind, children: Spec[], name?: string): Spec {
  return { kind, name, children };
}
interface Built {
  nodes: Record<string, TreeNode>;
  next: number;
}
function idOf(n: number): string {
  return `n${String(n).padStart(5, "0")}`;
}
/** Builds a CodeTree literal from a nested spec: pre-order ids, one line per node. */
function add(built: Built, spec: Spec, parentId: string | null, depth: number): string {
  const n = built.next++;
  const id = idOf(n);
  const node: TreeNode = {
    id, kind: spec.kind, depth, startLine: n + 1, endLine: n + 1, startCol: 0, endCol: 0, parentId, childIds: [],
  };
  if (spec.name !== undefined) node.name = spec.name;
  built.nodes[id] = node;
  node.childIds = (spec.children ?? []).map((child) => add(built, child, id, depth + 1));
  node.endLine = built.next;
  return id;
}
export function buildTree(root: Spec): CodeTree {
  const built: Built = { nodes: {}, next: 0 };
  const rootId = add(built, root, null, 0);
  return { rootId, nodes: built.nodes, issues: [] };
}
export const emptyTree: CodeTree = buildTree(leaf("module"));
export const flatTree: CodeTree = buildTree(
  branch("module", [leaf("import", "os"), leaf("assignment"), leaf("call", "print")]),
);
/** module > class > 2 methods; function > loop > call; conditional if/else; try; return. */
export const nestedTree: CodeTree = buildTree(
  branch("module", [
    branch("class", [leaf("method", "add"), leaf("method", "total")], "Shop"),
    branch("function", [
      branch("loop", [leaf("call", "print")]),
      branch("conditional", [leaf("return")], "if"),
      branch("conditional", [], "else"),
      branch("try", [leaf("assignment")]),
    ], "main"),
  ]),
);
export const kindTrees: Record<NodeKind, CodeTree> = {
  module: emptyTree,
  class: buildTree(branch("module", [leaf("class", "A")])),
  function: buildTree(branch("module", [leaf("function", "f")])),
  method: buildTree(branch("module", [branch("class", [leaf("method", "m")], "A")])),
  loop: buildTree(branch("module", [leaf("loop")])),
  conditional: buildTree(branch("module", [leaf("conditional", "if")])),
  try: buildTree(branch("module", [leaf("try")])),
  call: buildTree(branch("module", [leaf("call", "f")])),
  assignment: buildTree(branch("module", [leaf("assignment")])),
  return: buildTree(branch("module", [leaf("return")])),
  import: buildTree(branch("module", [leaf("import", "os")])),
  other: buildTree(branch("module", [leaf("other")])),
};
export const wideTree: CodeTree = buildTree(
  branch("module", Array.from({ length: 199 }, () => leaf("assignment"))),
);
/** 300 nodes: module > 99 functions each with 2 calls plus 1 module-level call. */
export const bigTree: CodeTree = buildTree(
  branch("module", [
    ...Array.from({ length: 99 }, () => branch("function", [leaf("call"), leaf("call")], "f")),
    leaf("call"),
  ]),
);
export const deepTree: CodeTree = buildTree(
  Array.from({ length: 20 }).reduceRight<Spec>((inner) => branch("function", [inner]), leaf("call")),
);
