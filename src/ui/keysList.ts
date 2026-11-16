export interface KeyRow {
  keys: string;
  action: string;
  /** `event.code` values this row documents; empty for keys outside the tree. */
  codes: readonly string[];
  shift?: boolean;
}

export const KEY_ROWS: readonly KeyRow[] = [
  { keys: "Down arrow, Up arrow", action: "Next or previous item", codes: ["ArrowDown", "ArrowUp"] },
  { keys: "Right arrow", action: "Expand, or go to the first item inside", codes: ["ArrowRight"] },
  { keys: "Left arrow", action: "Collapse, or go to the parent", codes: ["ArrowLeft"] },
  { keys: "Home, End", action: "First or last visible item", codes: ["Home", "End"] },
  { keys: "Enter", action: "Edit this construct in the editor", codes: ["Enter"] },
  { keys: "G", action: "Go to line", codes: ["KeyG"] },
  { keys: "E", action: "Jump to the error", codes: ["KeyE"] },
  { keys: "P", action: "Play overview", codes: ["KeyP"] },
  { keys: "F", action: "Play this construct", codes: ["KeyF"] },
  { keys: "R", action: "Run the code", codes: ["KeyR"] },
  { keys: "S", action: "Stop sound and speech", codes: ["KeyS"] },
  { keys: "T", action: "Turn speech on or off", codes: ["KeyT"] },
  { keys: "M", action: "Turn reduced sound on or off", codes: ["KeyM"] },
  { keys: "N", action: "Hear the explanation again", codes: ["KeyN"] },
  { keys: "L", action: "Open the sound legend", codes: ["KeyL"] },
  { keys: "Question mark (Shift plus Slash)", action: "Show this list", codes: ["Slash"], shift: true },
  { keys: "Escape (anywhere)", action: "Stop sound and speech", codes: [] },
  { keys: "Ctrl plus Enter (in the editor)", action: "Run the code", codes: [] },
];
