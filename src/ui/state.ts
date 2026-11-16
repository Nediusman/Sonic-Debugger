import { createNavState, rebaseState, visibleNodeIds } from "../navigation";
import type { CodeTree, NarrationResult, NavState, RunResult } from "../shared/types";
import type { ThemeName } from "./tokens";

export type { ThemeName };

export interface Settings {
  volume: number;
  reducedSound: boolean;
  speech: boolean;
  speechRate: number;
  theme: ThemeName;
  reduceMotion: boolean;
  dontShowWelcome: boolean;
}

export type RunStatus = "idle" | "running" | "finished" | "failed";
export type RuntimeState = "idle" | "loading" | "ready" | "failed";

export interface AppState {
  source: string;
  fileName: string | null;
  tree: CodeTree;
  nav: NavState;
  run: {
    status: RunStatus;
    result: RunResult | null;
    narration: NarrationResult | null;
    errorLine: number | null;
  };
  runtime: RuntimeState;
  goToLineOpen: boolean;
  audioPlaying: boolean;
  lastSound: string;
  settings: Settings;
}

export type AppAction =
  | { type: "sourceEdited"; source: string }
  | { type: "fileOpened"; name: string; source: string }
  | { type: "treeParsed"; tree: CodeTree }
  | { type: "runStarted" }
  | { type: "runFinished"; result: RunResult; narration: NarrationResult }
  | { type: "navigated"; nav: NavState }
  | { type: "runtimeChanged"; runtime: RuntimeState }
  | { type: "settingsChanged"; settings: Partial<Settings> }
  | { type: "audio"; playing: boolean; lastSound?: string }
  | { type: "goToLineOpen"; open: boolean };

export const DEFAULT_SETTINGS: Settings = {
  volume: 1,
  reducedSound: false,
  speech: false,
  speechRate: 1,
  theme: "default",
  reduceMotion: false,
  dontShowWelcome: false,
};

/** A tree with only a module node, used while the editor is empty or a parse is pending. */
export const EMPTY_TREE: CodeTree = {
  rootId: "root",
  issues: [],
  nodes: {
    root: {
      id: "root", kind: "module", depth: 0, startLine: 1, endLine: 1,
      startCol: 0, endCol: 0, parentId: null, childIds: [],
    },
  },
};

const IDLE_RUN: AppState["run"] = { status: "idle", result: null, narration: null, errorLine: null };

export function createInitialState(settings: Settings = DEFAULT_SETTINGS): AppState {
  return {
    source: "",
    fileName: null,
    tree: EMPTY_TREE,
    nav: createNavState(EMPTY_TREE),
    run: IDLE_RUN,
    runtime: "idle",
    goToLineOpen: false,
    audioPlaying: false,
    lastSound: "",
    settings,
  };
}

/** Number of lines the editor shows for `source` (an empty file is one line). */
export function countLines(source: string): number {
  return source.split("\n").length;
}

/** Offset of the first character of 1-based `line`, clamped to the source. `\r\n` is one break. */
export function lineStartOffset(source: string, line: number): number {
  let offset = 0;
  for (let current = 1; current < line; current++) {
    const next = source.indexOf("\n", offset);
    if (next === -1) return offset;
    offset = next + 1;
  }
  return offset;
}

/** Line of the innermost frame, or the root node's first line when there is none. */
export function failingLine(result: RunResult, tree: CodeTree): number {
  const frames = result.error?.frames ?? [];
  for (let i = frames.length - 1; i >= 0; i--) if (frames[i].line >= 1) return frames[i].line;
  return tree.nodes[tree.rootId].startLine;
}

function clamp(value: number, low: number, high: number): number {
  return Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;
}

export function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    volume: clamp(settings.volume, 0, 1),
    speechRate: clamp(settings.speechRate, 0.5, 2),
  };
}

function finishRun(state: AppState, result: RunResult, narration: NarrationResult): AppState {
  const failed = !result.ok;
  const known = failed && Object.hasOwn(state.tree.nodes, narration.nodeId);
  return {
    ...state,
    run: {
      status: failed ? "failed" : "finished",
      result,
      narration,
      errorLine: failed ? failingLine(result, state.tree) : null,
    },
    nav: { ...state.nav, errorNodeId: known ? narration.nodeId : null },
  };
}

function navigated(state: AppState, nav: NavState): AppState {
  const valid = Object.hasOwn(state.tree.nodes, nav.focusId) && visibleNodeIds(state.tree, nav).includes(nav.focusId);
  return valid ? { ...state, nav } : state;
}

/** Pure. Never mutates its input. */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "sourceEdited":
      return action.source === state.source ? state : { ...state, source: action.source };
    case "fileOpened":
      return {
        ...state,
        source: action.source,
        fileName: action.name,
        tree: EMPTY_TREE,
        nav: createNavState(EMPTY_TREE),
        run: state.run.status === "running" ? state.run : IDLE_RUN,
        goToLineOpen: false,
      };
    case "treeParsed":
      if (state.tree === action.tree || JSON.stringify(state.tree) === JSON.stringify(action.tree)) return state;
      return {
        ...state,
        tree: action.tree,
        nav: state.tree === EMPTY_TREE ? createNavState(action.tree) : rebaseState(state.tree, state.nav, action.tree),
      };
    case "runStarted":
      if (state.run.status === "running") return state;
      return {
        ...state,
        run: { status: "running", result: null, narration: null, errorLine: null },
        nav: { ...state.nav, errorNodeId: null },
      };
    case "runFinished":
      return state.run.status === "running" ? finishRun(state, action.result, action.narration) : state;
    case "navigated":
      return navigated(state, action.nav);
    case "runtimeChanged":
      return { ...state, runtime: action.runtime };
    case "settingsChanged":
      return { ...state, settings: normalizeSettings({ ...state.settings, ...action.settings }) };
    case "audio":
      return { ...state, audioPlaying: action.playing, lastSound: action.lastSound ?? state.lastSound };
    case "goToLineOpen":
      return { ...state, goToLineOpen: action.open };
  }
}
