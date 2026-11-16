import type { CodeTree, SoundEvent } from "../../shared/types";
import { nodeAtLine } from "../../parser";
import { defaultProfile, type SoundProfile } from "./profile";
import { nodePan } from "./pan";
export const ERROR_SINE_HZ = 311.13;
export const ERROR_SAW_HZ = 440;
export const ERROR_MS = 600;
/** Tritone cue at the failing node, or the root when the line is outside the tree (S-19). */
export function errorEvents(tree: CodeTree, line: number, profile: SoundProfile = defaultProfile): SoundEvent[] {
  const node = nodeAtLine(tree, line) ?? tree.nodes[tree.rootId];
  const base = {
    nodeId: node ? node.id : tree.rootId,
    startOffsetMs: 0,
    durationMs: ERROR_MS,
    gain: profile.maxGain,
    stereoPan: node ? nodePan(tree, node, profile) : 0,
  };
  return [
    { ...base, frequencyHz: ERROR_SINE_HZ, timbre: "error-sine" },
    { ...base, frequencyHz: ERROR_SAW_HZ, timbre: "error-saw" },
  ];
}
