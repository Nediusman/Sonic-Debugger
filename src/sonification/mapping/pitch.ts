import { defaultProfile, type SoundProfile } from "./profile";
import { round2 } from "./order";
/** Frequency for a nesting depth on the pentatonic scale; deeper is never lower. */
export function depthFrequency(depth: number, profile: SoundProfile = defaultProfile): number {
  const steps = profile.scaleSemitones.length;
  const index = Math.max(0, Math.min(Math.trunc(depth), profile.maxDepthIndex));
  const semitones = 12 * Math.floor(index / steps) + profile.scaleSemitones[index % steps];
  return round2(profile.baseHz * 2 ** (semitones / 12));
}
/** Frequency `semitones` above `hz` (negative goes down), equal tempered. */
export function shiftSemitones(hz: number, semitones: number): number {
  return round2(hz * 2 ** (semitones / 12));
}
