import type { SoundEvent, SonifyOptions } from "../../shared/types";
import { defaultProfile, type SoundProfile } from "./profile";
import { round2 } from "./order";
/** Clamp into (0, maxGain]. */
export function clampGain(gain: number, profile: SoundProfile = defaultProfile): number {
  return round2(Math.min(profile.maxGain, Math.max(0.01, gain)));
}
/** Reduced-sound mode halves duration and gain (S-17). */
export function applyLevel(events: SoundEvent[], options?: SonifyOptions): SoundEvent[] {
  if (!options?.reducedSound) return events;
  return events.map((e) => ({
    ...e,
    durationMs: round2(e.durationMs / 2),
    gain: round2(e.gain / 2),
  }));
}
