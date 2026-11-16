import type { CodeTree, SoundEvent } from "../../shared/types";
import { describeNode } from "../../parser";
import { round2 } from "./order";
function side(pan: number): string {
  if (pan < -0.2) return "left";
  return pan > 0.2 ? "right" : "center";
}
function subject(event: SoundEvent, tree: CodeTree): string {
  if (event.timbre === "error-sine" || event.timbre === "error-saw") return "error cue";
  const node = Object.hasOwn(tree.nodes, event.nodeId) ? tree.nodes[event.nodeId] : undefined;
  return node ? describeNode(tree, node) : event.nodeId;
}
/** Speech-friendly single-line text equivalent of one sound event (S-29). */
export function describeSoundEvent(event: SoundEvent, tree: CodeTree): string {
  const text = `${subject(event, tree)}, ${event.timbre} sound, ${round2(event.frequencyHz)} hertz, ${side(event.stereoPan)}`;
  return text.replace(/\s+/g, " ").trim();
}
