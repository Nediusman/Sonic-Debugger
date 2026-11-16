import { nodeAtLine } from "../../parser";
import type { CodeTree, NavState } from "../../shared/types";
import { ancestorIds, hasChildren } from "./tree";

function sortedUnique(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort();
}

export function createNavState(tree: CodeTree, errorNodeId: string | null = null): NavState {
  const root = tree.rootId;
  return {
    focusId: root,
    expandedIds: hasChildren(tree, root) ? [root] : [],
    errorNodeId: errorNodeId !== null && Object.hasOwn(tree.nodes, errorNodeId) ? errorNodeId : null,
  };
}

/** Add the ancestors of `id` to the expanded set. */
export function withAncestorsExpanded(tree: CodeTree, expanded: string[], id: string): string[] {
  return sortedUnique([...expanded, ...ancestorIds(tree, id)]);
}

export function rebaseState(oldTree: CodeTree, state: NavState, newTree: CodeTree): NavState {
  const oldFocus = Object.hasOwn(oldTree.nodes, state.focusId) ? oldTree.nodes[state.focusId] : null;
  const target = oldFocus ? nodeAtLine(newTree, oldFocus.startLine) : null;
  const focusId = target?.id ?? newTree.rootId;
  const kept = state.expandedIds.filter((id) => Object.hasOwn(newTree.nodes, id) && hasChildren(newTree, id));
  const errorId = state.errorNodeId;
  return {
    focusId,
    expandedIds: withAncestorsExpanded(newTree, kept, focusId),
    errorNodeId: errorId !== null && Object.hasOwn(newTree.nodes, errorId) ? errorId : null,
  };
}
