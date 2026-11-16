import type { RefObject } from "react";

export const REPEAT_DELAY_MS = 50;

export interface Announcer {
  politeRef: RefObject<HTMLElement | null>;
  alertRef: RefObject<HTMLElement | null>;
  /** Polite status message. The same text twice in a row is announced twice. */
  say(message: string): void;
  /** Assertive message, for run errors and failed actions only. */
  alert(message: string): void;
  clearAlert(): void;
}

/** Clears a live region, then sets the text a moment later so repeats are announced. */
export function createAnnouncer(): Announcer {
  const politeRef: RefObject<HTMLElement | null> = { current: null };
  const alertRef: RefObject<HTMLElement | null> = { current: null };
  const timers = new Map<RefObject<HTMLElement | null>, ReturnType<typeof setTimeout>>();

  function write(ref: RefObject<HTMLElement | null>, message: string): void {
    const element = ref.current;
    if (!element) return;
    clearTimeout(timers.get(ref));
    element.textContent = "";
    if (message === "") return;
    timers.set(ref, setTimeout(() => { element.textContent = message; }, REPEAT_DELAY_MS));
  }

  return {
    politeRef,
    alertRef,
    say: (message) => write(politeRef, message),
    alert: (message) => write(alertRef, message),
    clearAlert: () => write(alertRef, ""),
  };
}
