import type { SoundEvent } from "../../shared/types";
import { disposeVoice, scheduleVoice, type Voice } from "./voice";
export type PlayerState = "idle" | "playing" | "paused" | "stopped";
export type EventPhase = "start" | "end";
export interface Player {
  play(events: SoundEvent[]): void;
  pause(): void;
  resume(): void;
  stop(): void;
  setSpeed(n: number): void;
  onEvent(callback: (event: SoundEvent, phase: EventPhase) => void): void;
}
interface Cue {
  at: number;
  event: SoundEvent;
  phase: EventPhase;
  voice: Voice;
}
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
/** Seconds between `play` and the first sound, so scheduling never lands in the past. */
const LEAD_S = 0.05;
function byTime(a: Cue, b: Cue): number {
  return a.at - b.at || (a.phase === b.phase ? 0 : a.phase === "end" ? -1 : 1);
}
function ignoreRejection(result: unknown): void {
  if (result instanceof Promise) result.catch(() => undefined);
}
export function createPlayer(audioContext: AudioContext): Player {
  let state: PlayerState = "idle";
  let speed = 1;
  let cues: Cue[] = [];
  let voices: Voice[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const callbacks: Array<(event: SoundEvent, phase: EventPhase) => void> = [];

  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }
  function release(): void {
    clearTimer();
    voices.forEach(disposeVoice);
    voices = [];
    cues = [];
  }
  function notify(cue: Cue): void {
    for (const callback of callbacks) {
      try {
        callback(cue.event, cue.phase);
      } catch {
        // A faulty listener must not stop the sound.
      }
    }
    if (cue.phase === "end") disposeVoice(cue.voice);
  }
  function pump(): void {
    timer = undefined;
    if (state !== "playing") return;
    while (cues.length > 0 && cues[0].at <= audioContext.currentTime + 0.001) notify(cues.shift() as Cue);
    if (cues.length === 0) {
      voices = [];
      state = "idle";
      return;
    }
    timer = setTimeout(pump, Math.max(0, (cues[0].at - audioContext.currentTime) * 1000));
  }
  function schedule(events: SoundEvent[]): void {
    const t0 = audioContext.currentTime + LEAD_S;
    for (const event of events) {
      const start = t0 + event.startOffsetMs / 1000 / speed;
      const dur = Math.max(0.03, event.durationMs / 1000 / speed);
      const voice = scheduleVoice(audioContext, event, start, dur);
      voices.push(voice);
      cues.push({ at: start, event, phase: "start", voice }, { at: start + dur, event, phase: "end", voice });
    }
    cues.sort(byTime);
  }
  function stop(): void {
    if (state === "stopped") return;
    release();
    state = "stopped";
  }
  function play(events: SoundEvent[]): void {
    release();
    state = "idle";
    try {
      if (audioContext.state === "suspended") ignoreRejection(audioContext.resume());
      schedule(events);
    } catch {
      release();
      state = "stopped";
      return;
    }
    state = cues.length > 0 ? "playing" : "idle";
    if (state === "playing") pump();
  }
  function pause(): void {
    if (state !== "playing") return;
    clearTimer();
    try {
      ignoreRejection(audioContext.suspend());
    } catch {
      // Context already closed.
    }
    state = "paused";
  }
  function resume(): void {
    if (state !== "paused") return;
    try {
      ignoreRejection(audioContext.resume());
    } catch {
      // Context already closed.
    }
    state = "playing";
    pump();
  }
  function setSpeed(n: number): void {
    if (Number.isFinite(n)) speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, n));
  }
  function onEvent(callback: (event: SoundEvent, phase: EventPhase) => void): void {
    callbacks.push(callback);
  }
  return { play, pause, resume, stop, setSpeed, onEvent };
}
