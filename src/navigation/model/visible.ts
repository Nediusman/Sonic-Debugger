import type { CodeTree, NavState } from "../../shared/types";
import { childIdsOf } from "./tree";

/** Pre-order list of nodes, skipping the descendants of collapsed nodes. */
export function visibleNodeIds(tree: CodeTree, state: NavState): string[] {
  const expanded = new Set(state.expandedIds);
  const out: string[] = [];
  const stack: string[] = Object.hasOwn(tree.nodes, tree.rootId) ? [tree.rootId] : [];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    out.push(id);
    if (expanded.has(id)) stack.push(...childIdsOf(tree, id).reverse());
  }
  return out;
}
