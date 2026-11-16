import type { Timbre } from "../../shared/types";
export interface Synth {
  wave: OscillatorType;
  lowpassHz?: number;
  /** Seconds. The player uses max(attack, 15 ms fade) (A-S4). */
  attack: number;
  release: number;
  /** Pluck: seconds to fall to silence after the attack. */
  decay?: number;
  vibratoHz?: number;
  /** ASSUMPTION Q-S5: vibrato depth in cents. */
  vibratoCents?: number;
  tremoloHz?: number;
}
export const FADE_S = 0.015;
export const MAX_GAIN = 0.4;
const fade = FADE_S;
/** Synthesis parameters per timbre (design.md table). */
export const synthTable: Record<Timbre, Synth> = {
  module: { wave: "sine", attack: 0.08, release: fade },
  // ASSUMPTION Q-S5: class release 200 ms.
  class: { wave: "triangle", attack: 0.06, release: 0.2 },
  function: { wave: "square", lowpassHz: 1500, attack: 0.01, release: fade },
  method: { wave: "square", lowpassHz: 800, attack: 0.01, release: fade },
  loop: { wave: "sawtooth", lowpassHz: 2000, attack: fade, release: fade },
  conditional: { wave: "triangle", attack: fade, release: fade },
  try: { wave: "sine", attack: fade, release: fade, vibratoHz: 5, vibratoCents: 30 },
  call: { wave: "triangle", attack: fade, release: fade, decay: 0.04 },
  assignment: { wave: "sine", attack: fade, release: fade },
  return: { wave: "sine", attack: fade, release: fade },
  import: { wave: "sine", attack: fade, release: fade },
  other: { wave: "sine", attack: fade, release: fade },
  "error-sine": { wave: "sine", attack: fade, release: fade, tremoloHz: 4 },
  "error-saw": { wave: "sawtooth", attack: fade, release: fade, tremoloHz: 4 },
};
