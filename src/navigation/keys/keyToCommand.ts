import { KEY_MAP, RESERVED_CODES, SHIFT_SLASH } from "./keymap";
import type { KeyCommand, KeyLike } from "./types";

type Modifiers = Pick<KeyLike, "ctrlKey" | "altKey" | "metaKey" | "shiftKey">;

function onlyShift(m: Modifiers): boolean {
  return m.shiftKey && !m.ctrlKey && !m.altKey && !m.metaKey;
}

function anyModifier(m: Modifiers): boolean {
  return m.ctrlKey || m.altKey || m.metaKey || m.shiftKey;
}

/** Pure function of `code` and the four modifier flags. */
export function keyToCommand(event: KeyLike): KeyCommand | null {
  if (RESERVED_CODES.includes(event.code)) return null;
  if (event.code === "Slash" && onlyShift(event)) return SHIFT_SLASH;
  if (anyModifier(event)) return null;
  return Object.hasOwn(KEY_MAP, event.code) ? KEY_MAP[event.code] : null;
}

/** Escape stops audio everywhere on the page. Ctrl, Alt and Meta combinations are ignored. */
export function isStopAudioKey(event: KeyLike): boolean {
  return event.code === "Escape" && !event.ctrlKey && !event.altKey && !event.metaKey;
}
