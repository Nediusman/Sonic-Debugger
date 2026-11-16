import fc from "fast-check";
import type { CodeTree, NodeKind, TreeNode } from "../../shared/types";
const kinds: NodeKind[] = [
  "module", "class", "function", "method", "loop", "conditional", "try",
  "call", "assignment", "return", "import", "other",
];
const names = [undefined, "if", "elif", "else", "f"] as const;
const MAX_DEPTH = 25;
interface Pick {
  kind: NodeKind;
  name: (typeof names)[number];
  parentPick: number;
}
const pickArb: fc.Arbitrary<Pick> = fc.record({
  kind: fc.constantFrom(...kinds),
  name: fc.constantFrom(...names),
  parentPick: fc.nat(),
});
function idOf(i: number): string {
  return `n${String(i).padStart(5, "0")}`;
}
function makeNode(pick: Pick, i: number, parent: TreeNode | null): TreeNode {
  return {
    id: idOf(i), kind: i === 0 ? "module" : pick.kind, ...(pick.name ? { name: pick.name } : {}),
    depth: parent ? parent.depth + 1 : 0, startLine: i + 1, endLine: i + 1, startCol: 0, endCol: 0,
    parentId: parent ? parent.id : null, childIds: [],
  };
}
function parentFor(nodes: TreeNode[], pick: number): TreeNode {
  const open = nodes.filter((n) => n.depth < MAX_DEPTH);
  return open[pick % open.length];
}
/** Builds a valid CodeTree: each new node attaches to an earlier node of depth < 25. */
export function treeFromPicks(picks: Pick[]): CodeTree {
  const nodes: TreeNode[] = [];
  picks.forEach((pick, i) => {
    const parent = i === 0 ? null : parentFor(nodes, pick.parentPick);
    const node = makeNode(pick, i, parent);
    parent?.childIds.push(node.id);
    nodes.push(node);
  });
  const record: Record<string, TreeNode> = {};
  for (const node of nodes) record[node.id] = node;
  return { rootId: nodes[0].id, nodes: record, issues: [] };
}
/** Random valid trees: 1 to `maxNodes` nodes, depth up to 25. */
export function treeArb(maxNodes = 400): fc.Arbitrary<CodeTree> {
  return fc.array(pickArb, { minLength: 1, maxLength: maxNodes }).map(treeFromPicks);
}
/** Same tree with node-record keys and object keys inserted in reverse order (S-27). */
export function shuffledCopy(tree: CodeTree): CodeTree {
  const nodes: Record<string, TreeNode> = {};
  for (const id of Object.keys(tree.nodes).reverse()) {
    const node = tree.nodes[id];
    nodes[id] = Object.fromEntries(Object.entries(node).reverse()) as unknown as TreeNode;
  }
  return { issues: tree.issues, nodes, rootId: tree.rootId };
}
