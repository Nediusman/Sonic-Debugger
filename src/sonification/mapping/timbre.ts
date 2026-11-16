import type { SoundEvent, TreeNode } from "../../shared/types";
import { defaultProfile, type SoundProfile } from "./profile";
import { depthFrequency, shiftSemitones } from "./pitch";
import { round2 } from "./order";
export interface Slot {
  node: TreeNode;
  startMs: number;
  noteMs: number;
  pan: number;
}
/** How many note slots a kind occupies. ASSUMPTION Q-S4: multi-event motifs count inside the budget. */
export function slotWeight(kind: TreeNode["kind"]): number {
  if (kind === "loop") return 3;
  if (kind === "conditional" || kind === "return" || kind === "import") return 2;
  return 1;
}
function make(slot: Slot, offset: number, durationMs: number, frequencyHz: number, profile: SoundProfile, timbre = slot.node.kind): SoundEvent {
  return {
    nodeId: slot.node.id,
    startOffsetMs: round2(slot.startMs + offset),
    durationMs: round2(durationMs),
    frequencyHz,
    timbre,
    gain: profile.defaultGain,
    stereoPan: slot.pan,
  };
}
/** ASSUMPTION Q-S5: pulses are spaced 110 ms, or the note length if shorter; each lasts half a spacing. */
function loopEvents(slot: Slot, hz: number, profile: SoundProfile): SoundEvent[] {
  const spacing = Math.min(profile.loopPulseSpacingMs, slot.noteMs);
  return Array.from({ length: profile.loopPulses }, (_, i) =>
    make(slot, i * spacing, spacing / 2, hz, profile),
  );
}
/** `if` and `elif` rise; `else` falls; unnamed rises (ASSUMPTION Q-S5). */
function conditionalEvents(slot: Slot, hz: number, profile: SoundProfile): SoundEvent[] {
  const fifth = shiftSemitones(hz, profile.fifthSemitones);
  const [first, second] = slot.node.name === "else" ? [fifth, hz] : [hz, fifth];
  return [make(slot, 0, slot.noteMs, first, profile), make(slot, slot.noteMs, slot.noteMs, second, profile)];
}
function returnEvents(slot: Slot, hz: number, profile: SoundProfile): SoundEvent[] {
  const lower = shiftSemitones(hz, -profile.returnDropSemitones);
  return [make(slot, 0, slot.noteMs, hz, profile), make(slot, slot.noteMs, slot.noteMs, lower, profile)];
}
function importEvents(slot: Slot, hz: number, profile: SoundProfile): SoundEvent[] {
  return [make(slot, 0, profile.importMs, hz, profile), make(slot, 0, profile.importMs, round2(hz * 2), profile)];
}
/** Raw (unreduced) events of one node in its slot. Pure. */
export function nodeEvents(slot: Slot, profile: SoundProfile = defaultProfile): SoundEvent[] {
  const hz = depthFrequency(slot.node.depth, profile);
  switch (slot.node.kind) {
    case "loop": return loopEvents(slot, hz, profile);
    case "conditional": return conditionalEvents(slot, hz, profile);
    case "return": return returnEvents(slot, hz, profile);
    case "import": return importEvents(slot, hz, profile);
    case "assignment": return [make(slot, 0, profile.assignmentMs, hz, profile)];
    case "other": return [make(slot, 0, profile.otherMs, hz, profile)];
    default: return [make(slot, 0, slot.noteMs, hz, profile)];
  }
}
