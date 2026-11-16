import { firstChild, nextSibling, parent } from "../../parser";
import type { CodeTree, FocusPosition } from "../../shared/types";

export function childIdsOf(tree: CodeTree, id: string): string[] {
  const ids: string[] = [];
  for (let c = firstChild(tree, id); c; c = nextSibling(tree, c.id)) ids.push(c.id);
  return ids;
}

export function hasChildren(tree: CodeTree, id: string): boolean {
  return firstChild(tree, id) !== null;
}

export function ancestorIds(tree: CodeTree, id: string): string[] {
  const ids: string[] = [];
  for (let p = parent(tree, id); p; p = parent(tree, p.id)) ids.push(p.id);
  return ids;
}

export function positionOf(tree: CodeTree, nodeId: string): FocusPosition {
  const node = Object.hasOwn(tree.nodes, nodeId) ? tree.nodes[nodeId] : null;
  const owner = parent(tree, nodeId);
  if (!node || !owner) return { nodeId, index: 1, total: 1, level: node ? node.depth + 1 : 1 };
  return {
    nodeId,
    index: owner.childIds.indexOf(nodeId) + 1,
    total: owner.childIds.length,
    level: node.depth + 1,
  };
}
