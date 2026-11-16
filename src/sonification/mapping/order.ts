import type { SoundEvent } from "../../shared/types";
/** ASSUMPTION A-S1: round half up via Math.round. */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
/** Sort by startOffsetMs, then nodeId, then frequencyHz (ASSUMPTION A-S3). Returns a new array. */
export function sortEvents(events: readonly SoundEvent[]): SoundEvent[] {
  return [...events].sort(
    (a, b) =>
      a.startOffsetMs - b.startOffsetMs ||
      compareText(a.nodeId, b.nodeId) ||
      a.frequencyHz - b.frequencyHz,
  );
}
