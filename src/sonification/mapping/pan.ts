import type { CodeTree, TreeNode } from "../../shared/types";
import { defaultProfile, type SoundProfile } from "./profile";
import { round2 } from "./order";
/** Pan for sibling i of n: -0.8 + 1.6 * i / (n - 1), 0 for a single child or the root (S-15). */
export function nodePan(tree: CodeTree, node: TreeNode, profile: SoundProfile = defaultProfile): number {
  const owner = node.parentId === null ? undefined : tree.nodes[node.parentId];
  const n = owner?.childIds.length ?? 0;
  const i = owner?.childIds.indexOf(node.id) ?? -1;
  if (n <= 1 || i < 0) return 0;
  return round2(-profile.panSpread + (2 * profile.panSpread * i) / (n - 1));
}
