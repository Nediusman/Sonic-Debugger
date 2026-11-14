import type { CodeTree, TreeNode } from "../shared/types";

function find(tree: CodeTree, id: string): TreeNode | null {
  return Object.hasOwn(tree.nodes, id) ? tree.nodes[id] : null;
}

export function parent(tree: CodeTree, id: string): TreeNode | null {
  const node = find(tree, id);
  return node?.parentId == null ? null : find(tree, node.parentId);
}

export function firstChild(tree: CodeTree, id: string): TreeNode | null {
  const first = find(tree, id)?.childIds[0];
  return first === undefined ? null : find(tree, first);
}

function sibling(tree: CodeTree, id: string, step: 1 | -1): TreeNode | null {
  const owner = parent(tree, id);
  if (!owner) return null;
  const target = owner.childIds[owner.childIds.indexOf(id) + step];
  return target === undefined ? null : find(tree, target);
}

export function nextSibling(tree: CodeTree, id: string): TreeNode | null {
  return sibling(tree, id, 1);
}

export function previousSibling(tree: CodeTree, id: string): TreeNode | null {
  return sibling(tree, id, -1);
}

function contains(node: TreeNode, line: number): boolean {
  return node.startLine <= line && line <= node.endLine;
}

/** Deepest node containing the line; the earlier sibling wins ties (P-19). */
export function nodeAtLine(tree: CodeTree, line: number): TreeNode | null {
  let current = find(tree, tree.rootId);
  if (!current || !Number.isInteger(line) || !contains(current, line)) return null;
  for (;;) {
    const next: TreeNode | undefined = current.childIds
      .map((id) => find(tree, id))
      .find((child): child is TreeNode => child !== null && contains(child, line));
    if (!next) return current;
    current = next;
  }
}
