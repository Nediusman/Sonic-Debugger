import type { CodeTree, TreeNode } from "../../shared/types";
import { defaultProfile, type SoundProfile } from "./profile";
import { round2 } from "./order";
import { nodePan } from "./pan";
import { slotWeight, type Slot } from "./timbre";
export interface Layout {
  slots: Slot[];
  /** Sound-producing nodes in the whole tree (Q-S7: includes the root). */
  nodeCount: number;
  noteMs: number;
  limited: boolean;
  totalMs: number;
}
/** Pre-order walk from `startId`; unknown ids give []. Visits each node once. */
export function preorder(tree: CodeTree, startId: string): TreeNode[] {
  const out: TreeNode[] = [];
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    const node = Object.hasOwn(tree.nodes, id) ? tree.nodes[id] : undefined;
    if (!node || seen.has(id)) continue;
    seen.add(id);
    out.push(node);
    for (let i = node.childIds.length - 1; i >= 0; i--) stack.push(node.childIds[i]);
  }
  return out;
}
function sumWeights(nodes: TreeNode[]): number {
  return nodes.reduce((sum, n) => sum + slotWeight(n.kind), 0);
}
/** ASSUMPTION Q-S4: keep nodes while their slots fit under the floor note length in the budget. */
function truncate(nodes: TreeNode[], profile: SoundProfile): TreeNode[] {
  const maxUnits = Math.floor(profile.overviewMs / profile.minNoteMs);
  const kept: TreeNode[] = [];
  let units = 0;
  for (const node of nodes) {
    units += slotWeight(node.kind);
    if (units > maxUnits) break;
    kept.push(node);
  }
  return kept;
}
function place(tree: CodeTree, nodes: TreeNode[], noteMs: number, profile: SoundProfile): Slot[] {
  let cursor = 0;
  return nodes.map((node) => {
    const slot: Slot = { node, startMs: round2(cursor), noteMs, pan: nodePan(tree, node, profile) };
    cursor += slotWeight(node.kind) * noteMs;
    return slot;
  });
}
/** ASSUMPTION A-S1b: noteMs rounds down (not to nearest) so the total can never pass 10 s. */
function floor2(x: number): number {
  return Math.floor(x * 100 + 1e-9) / 100;
}
/** Overview layout (S-11, S-12, S-13). Slot units: sum of kind weights (ASSUMPTION Q-S4). */
export function overviewLayout(tree: CodeTree, profile: SoundProfile = defaultProfile): Layout {
  const all = preorder(tree, tree.rootId);
  const units = Math.max(1, sumWeights(all));
  const limited = profile.overviewMs / units < profile.minNoteMs;
  const nodes = limited ? truncate(all.filter((n) => n.depth <= 2), profile) : all;
  const noteMs = floor2(
    Math.min(profile.baseNoteMs, Math.max(profile.minNoteMs, profile.overviewMs / Math.max(1, sumWeights(nodes)))),
  );
  const slots = place(tree, nodes, noteMs, profile);
  return { slots, nodeCount: all.length, noteMs, limited, totalMs: round2(sumWeights(nodes) * noteMs) };
}
/** Focus layout: the node and its descendants, 220 ms notes (ASSUMPTION Q-S2). */
export function focusLayout(tree: CodeTree, nodeId: string, profile: SoundProfile = defaultProfile): Slot[] {
  return place(tree, preorder(tree, nodeId), profile.baseNoteMs, profile);
}
/** Spoken summary of an overview (S-13, S-30). */
export function describeOverview(layout: Layout): string {
  if (layout.limited) return `overview limited to top-level constructs, ${layout.nodeCount} in total`;
  return `Overview: ${layout.nodeCount} constructs, about ${Math.round(layout.totalMs / 1000)} seconds`;
}
