export type NavIntent =
  | "next" | "previous" | "first" | "last"
  | "expandOrDescend"
  | "collapseOrAscend";

export type AppCommand =
  | "promptGoToLine" | "goToError" | "playOverview" | "playFocus"
  | "stopAudio" | "run" | "toggleSpeech" | "toggleReducedSound"
  | "repeatNarration" | "editHere" | "showLegend" | "showKeys";

export type KeyCommand =
  | { kind: "nav"; intent: NavIntent }
  | { kind: "app"; command: AppCommand };

export interface KeyLike {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
}
