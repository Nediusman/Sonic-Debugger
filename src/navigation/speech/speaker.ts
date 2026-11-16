export interface UtteranceLike {
  text: string;
  rate: number;
  lang: string;
}

export interface SpeechSynthesisLike {
  speak(utterance: UtteranceLike): void;
  cancel(): void;
}

export interface Speaker {
  readonly supported: boolean;
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  setRate(rate: number): void;
  speak(text: string): void;
  cancel(): void;
}

export const SPEECH_UNSUPPORTED_MESSAGE = "Speech is not supported in this browser";
export const MIN_RATE = 0.5;
export const MAX_RATE = 2;

type UtteranceFactory = (text: string, rate: number) => UtteranceLike;

function browserSynth(): SpeechSynthesisLike | undefined {
  return (globalThis as { speechSynthesis?: SpeechSynthesisLike }).speechSynthesis;
}

function browserUtterance(text: string, rate: number): UtteranceLike {
  const Ctor = (globalThis as { SpeechSynthesisUtterance?: new (text: string) => UtteranceLike })
    .SpeechSynthesisUtterance;
  if (!Ctor) return { text, rate, lang: "en" };
  const utterance = new Ctor(text);
  utterance.rate = rate;
  utterance.lang = "en";
  return utterance;
}

function attempt(action: () => void): void {
  try {
    action();
  } catch {
    // Speech is optional; a failing synthesizer must not break navigation.
  }
}

export function clampRate(rate: number): number {
  return Number.isFinite(rate) ? Math.min(MAX_RATE, Math.max(MIN_RATE, rate)) : 1;
}

/** Off by default. Does nothing, and never throws, when the Web Speech API is missing. */
export function createSpeaker(
  synth: SpeechSynthesisLike | undefined = browserSynth(),
  makeUtterance: UtteranceFactory = browserUtterance,
): Speaker {
  const supported = synth !== undefined;
  let enabled = false;
  let rate = 1;
  const cancel = (): void => {
    if (synth) attempt(() => synth.cancel());
  };
  return {
    supported,
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = supported && on;
      if (!enabled) cancel();
    },
    setRate(next) {
      rate = clampRate(next);
    },
    speak(text) {
      if (!enabled || !synth) return;
      cancel();
      attempt(() => synth.speak(makeUtterance(text, rate)));
    },
    cancel,
  };
}
