import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sampleTree } from "../navigation/fixtures/trees";
import { navigate } from "../navigation";
import type { NarrationResult, RunResult } from "../shared/types";
import {
  errorMessage, exampleMessage, explanationMessage, finishedMessage, lineProblemMessage,
  openedMessage, openFailedMessage, structureMessage, toggleMessage,
} from "./messages";
import { appReducer, countLines, createInitialState, DEFAULT_SETTINGS, lineStartOffset, type AppAction, type AppState, type Settings } from "./state";
import { loadSettings, saveSettings, SETTINGS_KEY } from "./storage";
import { THEMES, TOKEN_PAIRS, contrastRatio, minimumContrast, tokensCss, type ThemeName } from "./tokens";

const RUNS = { numRuns: 200 };

describe("UP-1 lineStartOffset", () => {
  it("returns the start of the requested line", () => {
    fc.assert(
      fc.property(fc.string({ unit: fc.constantFrom("a", "b", "\n", "\r", " ") }), fc.nat(), (source, n) => {
        const line = 1 + (n % countLines(source));
        const o = lineStartOffset(source, line);
        expect(o === 0 || source[o - 1] === "\n").toBe(true);
        expect(source.slice(0, o).split("\n").length - 1).toBe(line - 1);
      }),
      RUNS,
    );
  });
});

const text = fc.string({ maxLength: 600 });
const narration: fc.Arbitrary<NarrationResult> = fc.record({
  summary: text, location: text, cause: text, suggestedFix: text, nodeId: fc.string(), offline: fc.boolean(),
});

describe("UP-2 messages", () => {
  const banned = /[`*#<>{}[\]|\\]/;
  const builders: [string, fc.Arbitrary<string>][] = [
    ["opened", fc.tuple(text, fc.nat(), fc.nat()).map(([a, b, c]) => openedMessage(a, b, c))],
    ["example", fc.nat().map(exampleMessage)],
    ["structure", fc.tuple(fc.nat(), fc.array(fc.record({ line: fc.nat(), column: fc.nat(), message: text }), { maxLength: 4 })).map(([n, i]) => structureMessage(n, i))],
    ["finished", text.map(finishedMessage)],
    ["error", narration.map(errorMessage)],
    ["explanation", narration.map(explanationMessage)],
    ["line problem", fc.tuple(text, fc.nat()).map(([i, n]) => lineProblemMessage(i, n))],
    ["toggle", fc.tuple(fc.constantFrom("Speech" as const, "Reduced sound" as const), fc.boolean()).map(([a, b]) => toggleMessage(a, b))],
    ["open failed", fc.tuple(text, text).map(([a, b]) => openFailedMessage(a, b))],
  ];
  for (const [name, arb] of builders) {
    it(`${name} is one clean line`, () => {
      fc.assert(
        fc.property(arb, (m) => {
          expect(m.length).toBeGreaterThan(0);
          expect(m.length).toBeLessThanOrEqual(400);
          expect(m).not.toMatch(/\n|\r/);
          expect(m).not.toMatch(banned);
        }),
        RUNS,
      );
    });
  }
  it("error message keeps the key hint however long the text", () => {
    fc.assert(fc.property(narration, (n) => {
      expect(errorMessage(n)).toMatch(/Press E to go to the failing construct\.$/);
    }), RUNS);
  });
});

const settings: fc.Arbitrary<Settings> = fc.record({
  volume: fc.integer({ min: 0, max: 20 }).map((n) => n / 20),
  reducedSound: fc.boolean(),
  speech: fc.boolean(),
  speechRate: fc.integer({ min: 5, max: 20 }).map((n) => n / 10),
  theme: fc.constantFrom<ThemeName>("default", "high-contrast"),
  reduceMotion: fc.boolean(),
  dontShowWelcome: fc.boolean(),
});

function memory(initial?: string) {
  const data = new Map<string, string>(initial === undefined ? [] : [[SETTINGS_KEY, initial]]);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("UP-3 settings storage", () => {
  it("load(save(s)) equals s, except speech which always starts off", () => {
    fc.assert(
      fc.property(settings, (s) => {
        const store = memory();
        saveSettings(store, s);
        expect(loadSettings(store)).toEqual({ ...s, speech: false });
      }),
      RUNS,
    );
  });
  it("falls back to defaults for garbage, missing or throwing storage", () => {
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(throwing, DEFAULT_SETTINGS)).not.toThrow();
    fc.assert(fc.property(fc.string(), (junk) => {
      const loaded = loadSettings(memory(junk));
      expect(loaded.volume).toBeGreaterThanOrEqual(0);
      expect(loaded.volume).toBeLessThanOrEqual(1);
      expect(loaded.speech).toBe(false);
    }), RUNS);
  });
  it("clamps out-of-range stored values", () => {
    const loaded = loadSettings(memory(JSON.stringify({ volume: 9, speechRate: 0, theme: "pink" })));
    expect(loaded).toMatchObject({ volume: 1, speechRate: 0.5, theme: "default" });
  });
});

describe("UP-4 contrast", () => {
  for (const name of Object.keys(THEMES) as ThemeName[]) {
    it(`every declared pair passes in ${name}`, () => {
      fc.assert(
        fc.property(fc.constantFrom(...TOKEN_PAIRS), (pair) => {
          const ratio = contrastRatio(THEMES[name][pair.fg], THEMES[name][pair.bg]);
          expect(ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(minimumContrast(pair.kind));
        }),
        { numRuns: 300 },
      );
    });
  }
  it("generates a stylesheet for both themes", () => {
    expect(tokensCss()).toContain('data-theme="high-contrast"');
  });
});

const okRun: RunResult = { ok: true, source: "", stdout: "x\n" };
const badRun: RunResult = { ok: false, source: "", stdout: "", error: { type: "IndexError", message: "m", frames: [{ file: "f", line: 10, fn: "g" }] } };
const nar = (nodeId: string): NarrationResult => ({ summary: "s", location: "l", cause: "c", suggestedFix: "f", nodeId, offline: true });
const ids = Object.keys(sampleTree.nodes);

const action: fc.Arbitrary<AppAction> = fc.oneof(
  fc.string({ maxLength: 20 }).map((source) => ({ type: "sourceEdited", source }) as AppAction),
  fc.string({ maxLength: 20 }).map((source) => ({ type: "fileOpened", name: "a.py", source }) as AppAction),
  fc.constant<AppAction>({ type: "treeParsed", tree: sampleTree }),
  fc.constant<AppAction>({ type: "runStarted" }),
  fc.constantFrom(...ids, "gone").map((id) => ({ type: "runFinished", result: badRun, narration: nar(id) }) as AppAction),
  fc.constant<AppAction>({ type: "runFinished", result: okRun, narration: nar("n0") }),
  settings.map((s) => ({ type: "settingsChanged", settings: s }) as AppAction),
);

describe("UP-5 reducer validity", () => {
  it("keeps the state valid for any action sequence", () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 40 }), (actions) => {
        let state: AppState = createInitialState();
        let lastText = state.source;
        for (const a of actions) {
          const frozen = JSON.stringify(state);
          const next = appReducer(state, a);
          expect(JSON.stringify(state)).toBe(frozen);
          if (a.type === "sourceEdited" || a.type === "fileOpened") lastText = a.source;
          const legal: Record<string, string[]> = {
            idle: ["idle", "running"], running: ["running", "finished", "failed"],
            // Opening a file (U-5) resets a finished run to idle.
            finished: ["finished", "running", "idle"], failed: ["failed", "running", "idle"],
          };
          expect(legal[state.run.status]).toContain(next.run.status);
          expect(next.source).toBe(lastText);
          const e = next.nav.errorNodeId;
          expect(e === null || Object.hasOwn(next.tree.nodes, e)).toBe(true);
          expect(Object.hasOwn(next.tree.nodes, next.nav.focusId)).toBe(true);
          state = next;
        }
      }),
      RUNS,
    );
  });
  it("accepts real navigation results", () => {
    const base = appReducer(createInitialState(), { type: "treeParsed", tree: sampleTree });
    const moved = navigate(sampleTree, base.nav, { type: "last" });
    expect(appReducer(base, { type: "navigated", nav: moved.state }).nav.focusId).toBe(moved.state.focusId);
  });
});
