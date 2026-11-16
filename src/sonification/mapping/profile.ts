/** Sound profile: every tunable number of the mapping, so it can change without touching the logic. */
export interface SoundProfile {
  baseHz: number;
  scaleSemitones: readonly number[];
  maxDepthIndex: number;
  defaultGain: number;
  maxGain: number;
  baseNoteMs: number;
  minNoteMs: number;
  overviewMs: number;
  panSpread: number;
  loopPulses: number;
  loopPulseSpacingMs: number;
  importMs: number;
  assignmentMs: number;
  otherMs: number;
  fifthSemitones: number;
  returnDropSemitones: number;
}
export const defaultProfile: SoundProfile = {
  baseHz: 130.81,
  scaleSemitones: [0, 2, 4, 7, 9],
  maxDepthIndex: 14,
  defaultGain: 0.25,
  maxGain: 0.4,
  baseNoteMs: 220,
  minNoteMs: 60,
  overviewMs: 10000,
  panSpread: 0.8,
  loopPulses: 3,
  loopPulseSpacingMs: 110,
  importMs: 120,
  assignmentMs: 30,
  // ASSUMPTION Q-S1: `other` is a sine, 20 ms tick, plain pitch by depth.
  otherMs: 20,
  // ASSUMPTION A-S2/Q-S3: equal-tempered perfect fifth.
  fifthSemitones: 7,
  // ASSUMPTION Q-S5: return falls a major third (4 semitones).
  returnDropSemitones: 4,
};
