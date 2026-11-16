import type { CodeTree, SoundEvent } from "../shared/types";
import type { Player } from "../sonification";
import type { AppServices } from "./services";

export const AUDIO_FAILED_MESSAGE = "Audio could not start. Use the text descriptions instead.";

export interface AudioHooks {
  volume(): number;
  onPlaying(playing: boolean, lastSound?: string): void;
  onFailure(): void;
}

export interface AudioController {
  /** Creates the AudioContext on first use. Call from a user-gesture handler. */
  prepare(): boolean;
  /** Plays events (volume scaled). `afterEnd` runs when the last event ends, or at once if nothing can play. */
  play(events: SoundEvent[], tree: CodeTree, afterEnd?: () => void): void;
  /** Stops all sound. Returns true if something was playing. */
  stop(): boolean;
  isPlaying(): boolean;
}

function scale(events: SoundEvent[], volume: number): SoundEvent[] {
  return events.map((e) => ({ ...e, gain: e.gain * volume }));
}

export function createAudio(services: AppServices, hooks: AudioHooks): AudioController {
  let context: AudioContext | null = null;
  let player: Player | null = null;
  let failed = false;
  let playing = false;
  let remaining = 0;
  let after: (() => void) | undefined;
  let currentTree: CodeTree | null = null;

  const fail = (): void => {
    if (!failed) hooks.onFailure();
    failed = true;
  };

  const finish = (): void => {
    playing = false;
    hooks.onPlaying(false);
    const callback = after;
    after = undefined;
    callback?.();
  };

  const onEvent = (event: SoundEvent, phase: "start" | "end"): void => {
    if (!currentTree) return;
    if (phase === "start") {
      playing = true;
      hooks.onPlaying(true, services.describeSoundEvent(event, currentTree));
    } else if (--remaining <= 0) finish();
  };

  function prepare(): boolean {
    if (failed) return false;
    if (player && context?.state !== "closed") return true;
    try {
      context = services.createAudioContext();
      player = services.createPlayer(context);
      player.onEvent(onEvent);
      return true;
    } catch {
      fail();
      return false;
    }
  }

  function play(events: SoundEvent[], tree: CodeTree, afterEnd?: () => void): void {
    after = undefined;
    if (!prepare() || !player || events.length === 0) {
      afterEnd?.();
      return;
    }
    currentTree = tree;
    remaining = events.length;
    after = afterEnd;
    try {
      player.play(scale(events, hooks.volume()));
    } catch {
      fail();
    }
    if (context?.state === "closed") {
      fail();
      after = undefined;
      afterEnd?.();
    }
  }

  function stop(): boolean {
    const was = playing;
    after = undefined;
    remaining = 0;
    playing = false;
    try {
      player?.stop();
    } catch {
      // The context is already closed; there is nothing left to stop.
    }
    if (was) hooks.onPlaying(false);
    return was;
  }

  return { prepare, play, stop, isPlaying: () => playing };
}
