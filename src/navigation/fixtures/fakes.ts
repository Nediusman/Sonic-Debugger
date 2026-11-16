import type { SpeechSynthesisLike, UtteranceLike } from "../speech/speaker";

export class FakeSynth implements SpeechSynthesisLike {
  queue: UtteranceLike[] = [];
  spoken = 0;
  speak(u: UtteranceLike): void {
    this.spoken += 1;
    this.queue.push(u);
  }
  cancel(): void {
    this.queue = [];
  }
}
