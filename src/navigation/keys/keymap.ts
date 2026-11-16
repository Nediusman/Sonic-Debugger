import type { KeyCommand } from "./types";

const nav = (intent: Extract<KeyCommand, { kind: "nav" }>["intent"]): KeyCommand => ({ kind: "nav", intent });
const app = (command: Extract<KeyCommand, { kind: "app" }>["command"]): KeyCommand => ({ kind: "app", command });

/** Unmodified keys, by `event.code`, that act while the tree has focus. */
export const KEY_MAP: Readonly<Record<string, KeyCommand>> = {
  ArrowDown: nav("next"),
  ArrowUp: nav("previous"),
  ArrowRight: nav("expandOrDescend"),
  ArrowLeft: nav("collapseOrAscend"),
  Home: nav("first"),
  End: nav("last"),
  KeyG: app("promptGoToLine"),
  KeyE: app("goToError"),
  KeyP: app("playOverview"),
  KeyF: app("playFocus"),
  KeyS: app("stopAudio"),
  KeyR: app("run"),
  KeyT: app("toggleSpeech"),
  KeyM: app("toggleReducedSound"),
  KeyN: app("repeatNarration"),
  KeyL: app("showLegend"),
  Enter: app("editHere"),
};

/** `?` is Shift plus the slash key (Q-U1). */
export const SHIFT_SLASH: KeyCommand = app("showKeys");

export const RESERVED_CODES: readonly string[] = [
  "F6", "Insert", "CapsLock",
  "AltLeft", "AltRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight",
];

/** Human-readable key list, in display order. Used by the README and the key list dialog. */
export const KEY_LIST: readonly { keys: string; action: string }[] = [
  { keys: "Down arrow, Up arrow", action: "Next or previous item" },
  { keys: "Right arrow", action: "Expand, or go to the first item inside" },
  { keys: "Left arrow", action: "Collapse, or go to the parent" },
  { keys: "Home, End", action: "First or last visible item" },
  { keys: "Enter", action: "Edit this construct in the editor" },
  { keys: "G", action: "Go to line" },
  { keys: "E", action: "Go to the error" },
  { keys: "P", action: "Play the overview sound" },
  { keys: "F", action: "Play the focused construct" },
  { keys: "R", action: "Run the code" },
  { keys: "S or Escape", action: "Stop all sound" },
  { keys: "T", action: "Turn speech on or off" },
  { keys: "M", action: "Turn reduced sound on or off" },
  { keys: "N", action: "Repeat the last explanation" },
  { keys: "L", action: "Open the sound legend" },
  { keys: "Question mark (Shift plus Slash)", action: "Show this list" },
  { keys: "Type-ahead", action: "Not supported" },
];
