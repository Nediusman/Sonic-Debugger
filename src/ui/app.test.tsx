// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import { keyToCommand } from "../navigation";
import { sampleTree } from "../navigation/fixtures/trees";
import type { CodeTree, NarrationResult, RunResult, SoundEvent } from "../shared/types";
import { KEY_ROWS } from "./keysList";
import { SETTINGS_KEY } from "./storage";
import type { AppServices } from "./services";

const failedRun: RunResult = {
  ok: false, source: "", stdout: "",
  error: { type: "IndexError", message: "list index out of range", frames: [{ file: "main.py", line: 4, fn: "main" }] },
};
const narration: NarrationResult = {
  summary: "An index is out of range.", location: "line 4, in main", cause: "The list is short.",
  suggestedFix: "Check the length.", nodeId: "n6", offline: true,
};
const cue: SoundEvent[] = [{ nodeId: "n6", startOffsetMs: 0, durationMs: 100, frequencyHz: 440, timbre: "error-saw", gain: 0.4, stereoPan: 0 }];

interface Fakes {
  services: AppServices;
  calls: string[];
  contexts: number;
  parse: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
}

function fakes(result: RunResult = failedRun, stored: Record<string, string> = { [SETTINGS_KEY]: JSON.stringify({ dontShowWelcome: true }) }): Fakes {
  const calls: string[] = [];
  const parse = vi.fn(async (source: string): Promise<CodeTree> => (source.includes("!!") ? { ...sampleTree, issues: [{ line: 1, column: 2, message: "bad" }] } : sampleTree));
  const stop = vi.fn();
  const cancel = vi.fn();
  const play = vi.fn((events: SoundEvent[]) => calls.push(`play:${events[0]?.nodeId}`));
  const f = { calls, contexts: 0, parse, stop, cancel, play } as Fakes;
  f.services = {
    parse,
    runCode: async () => result,
    narrate: async () => narration,
    onRuntimeStatus: (cb) => { cb("ready"); return () => undefined; },
    preloadRuntime: () => undefined,
    sonifyTree: () => cue,
    sonifyNode: (_t, id) => [{ ...cue[0], nodeId: id, timbre: "function" }],
    sonifyError: () => cue,
    describeSoundEvent: (e) => `sound for ${e.nodeId}`,
    describeOverview: () => "Overview: 7 constructs, about 3 seconds",
    describeNode: (_t, id) => `node ${id}`,
    createPlayer: () => ({ play, stop, pause: vi.fn(), resume: vi.fn(), setSpeed: vi.fn(), onEvent: vi.fn() }),
    createAudioContext: () => { f.contexts += 1; return {} as AudioContext; },
    createSpeaker: () => ({ supported: true, enabled: false, setEnabled: vi.fn(), setRate: vi.fn(), speak: vi.fn(), cancel }),
    storage: { getItem: (k) => stored[k] ?? null, setItem: (k, v) => { stored[k] = v; } },
  };
  return f;
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
  Element.prototype.scrollIntoView = () => undefined;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const polite = (): HTMLElement => document.querySelector('[role="status"]') as HTMLElement;
const alertRegion = (): HTMLElement => document.querySelector('[role="alert"]') as HTMLElement;
async function settle(ms = 100): Promise<void> {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}
function tree(): HTMLElement { return screen.getAllByRole("treeitem")[0]; }

describe("page structure (U-1, U-2, U-27)", () => {
  it("renders landmarks, headings and one polite and one assertive region, both empty", () => {
    render(<App services={fakes().services} />);
    expect(screen.getByRole("link", { name: "Skip to structure tree" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Sonic Debugger" })).toBeTruthy();
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Editor", "Structure", "Output"]);
    expect(screen.getByRole("link", { name: "Keyboard shortcuts" })).toBeTruthy();
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(polite().textContent).toBe("");
    expect(alertRegion().textContent).toBe("");
  });

  it("has focusable controls in the specified order and no positive tabindex", () => {
    render(<App services={fakes().services} />);
    const focusables = [...document.querySelectorAll<HTMLElement>("a[href], button, textarea, input:not([hidden]), select, pre[tabindex], [tabindex='0']")]
      .filter((el) => !el.closest("dialog") && !el.closest("[hidden]") && !el.closest("#keys"));
    const names = focusables.map((el) => el.getAttribute("aria-label") && el.tagName === "PRE" ? "output" : (el.textContent || el.id).trim());
    const at = (text: string): number => names.findIndex((n) => n.startsWith(text));
    const order = ["Skip to", "Settings", "Open Python", "Load an example", "code", "Run (R)", "module", "Next", "Play overview", "Reduced sound", "output", "Hear it again", "Keyboard shortcuts"];
    const positions = order.map(at);
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect([...document.querySelectorAll("[tabindex]")].every((el) => Number(el.getAttribute("tabindex")) <= 0)).toBe(true);
  });

  it("labels the editor textarea and disables editing helpers", () => {
    render(<App services={fakes().services} />);
    const box = screen.getByLabelText("Python code") as HTMLTextAreaElement;
    expect(box.getAttribute("spellcheck")).toBe("false");
    expect(box.getAttribute("autocomplete")).toBe("off");
    expect(box.getAttribute("autocapitalize")).toBe("off");
    expect(screen.getByText("1 line")).toBeTruthy();
  });
});

describe("welcome dialog (U-37)", () => {
  it("opens when the flag is not stored and closes with Escape", () => {
    render(<App services={fakes(failedRun, {}).services} />);
    expect(screen.getByRole("dialog", { name: "Welcome to Sonic Debugger" })).toBeTruthy();
    expect(screen.getByLabelText("Don't show again")).toBeTruthy();
  });
  it("stays closed when the flag is stored", () => {
    render(<App services={fakes().services} />);
    expect(document.querySelector("dialog[open]")).toBeNull();
  });
});

describe("audio (U-30, U-31)", () => {
  it("creates no AudioContext at load, creates one in the first gesture, reuses it", () => {
    const f = fakes();
    render(<App services={f.services} />);
    expect(f.contexts).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Play overview (P)" }));
    fireEvent.click(screen.getByRole("button", { name: "Play this construct (F)" }));
    expect(f.contexts).toBe(1);
    expect(f.play).toHaveBeenCalledTimes(2);
  });
  it("Escape stops sound and speech in the same handler", () => {
    const f = fakes();
    render(<App services={f.services} />);
    fireEvent.click(screen.getByRole("button", { name: "Play overview (P)" }));
    fireEvent.keyDown(document.body, { code: "Escape" });
    expect(f.stop).toHaveBeenCalled();
    expect(f.cancel).toHaveBeenCalled();
  });
  it("applies the volume setting to event gain", () => {
    const f = fakes(failedRun, { [SETTINGS_KEY]: JSON.stringify({ dontShowWelcome: true, volume: 0.5 }) });
    render(<App services={f.services} />);
    fireEvent.click(screen.getByRole("button", { name: "Play overview (P)" }));
    expect((f.play.mock.calls[0][0] as SoundEvent[])[0].gain).toBeCloseTo(0.2);
  });
});

describe("keys in the tree and the editor (U-9, Table U-1)", () => {
  it("R in the tree runs; letters in the editor do not", async () => {
    vi.useFakeTimers();
    const f = fakes();
    render(<App services={f.services} />);
    const box = screen.getByLabelText("Python code");
    fireEvent.change(box, { target: { value: "x = 1" } });
    fireEvent.keyDown(box, { code: "KeyR" });
    await settle();
    expect(screen.getByText("Not run yet")).toBeTruthy();
    fireEvent.keyDown(box, { code: "Enter", ctrlKey: true });
    await settle();
    expect(screen.getByText("Error")).toBeTruthy();
  });

  it("failed run: alert once, Error here badge, cue played, focus unchanged (U-16)", async () => {
    vi.useFakeTimers();
    const f = fakes();
    render(<App services={f.services} />);
    fireEvent.change(screen.getByLabelText("Python code"), { target: { value: "x = 1" } });
    await settle(400);
    const item = tree();
    item.focus();
    fireEvent.keyDown(item, { code: "KeyR" });
    await settle();
    expect(alertRegion().textContent).toBe(
      "An index is out of range. line 4, in main. The list is short. Check the length. Press E to go to the failing construct.",
    );
    expect(document.activeElement).toBe(item);
    fireEvent.keyDown(item, { code: "KeyE" });
    await settle();
    expect(screen.getAllByText("Error here")).toHaveLength(1);
    expect(f.calls).toContain("play:n6");
    expect(screen.getByText("offline explanation")).toBeTruthy();
    expect(screen.getByText("Suggested fix")).toBeTruthy();
  });

  it("E announces when there is no error", async () => {
    vi.useFakeTimers();
    render(<App services={fakes().services} />);
    const item = tree();
    item.focus();
    fireEvent.keyDown(item, { code: "KeyE" });
    await settle();
    expect(polite().textContent).toBe("No error to go to. Run the code first.");
  });

  it("Enter on a treeitem puts the caret at the construct's line", async () => {
    vi.useFakeTimers();
    render(<App services={fakes().services} />);
    const box = screen.getByLabelText("Python code") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "a\nb\nc\nd\ne" } });
    await settle(400);
    fireEvent.click(screen.getByRole("button", { name: "Last" }));
    const item = document.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]') as HTMLElement;
    item.focus();
    fireEvent.keyDown(item, { code: "Enter" });
    await settle();
    expect(document.activeElement).toBe(box);
    expect(polite().textContent).toMatch(/^Editing line \d+$/);
  });

  it("Go to line form: opens, validates, closes with Escape", async () => {
    vi.useFakeTimers();
    render(<App services={fakes().services} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to line (G)" }));
    const input = screen.getByLabelText("Line number");
    await settle();
    expect(document.activeElement).toBe(input);
    expect(polite().textContent).toBe("Go to line, enter a number");
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    await settle();
    expect(polite().textContent).toMatch(/not a line/);
    fireEvent.keyDown(input, { code: "Escape" });
    await settle();
    expect(document.activeElement?.getAttribute("role")).toBe("treeitem");
  });
});

describe("re-parse debounce (U-10)", () => {
  it("50 edits within 300 ms give one parse and one announcement", async () => {
    vi.useFakeTimers();
    const f = fakes();
    render(<App services={f.services} />);
    const box = screen.getByLabelText("Python code");
    for (let i = 0; i < 50; i++) fireEvent.change(box, { target: { value: `x = ${i}` } });
    await settle(100);
    expect(f.parse).not.toHaveBeenCalled();
    await settle(400);
    expect(f.parse).toHaveBeenCalledTimes(1);
    expect(polite().textContent).toBe("Structure updated, 7 constructs");
  });
  it("lists syntax issues as text", async () => {
    vi.useFakeTimers();
    render(<App services={fakes().services} />);
    fireEvent.change(screen.getByLabelText("Python code"), { target: { value: "!!" } });
    await settle(400);
    expect(screen.getByRole("list", { name: "Syntax issues" }).textContent).toBe("Line 1, column 2: bad");
    expect(polite().textContent).toBe("Structure updated, 7 constructs, 1 syntax issue. First: line 1, bad");
  });
});

describe("example, legend, settings", () => {
  it("loads the example and announces it", async () => {
    vi.useFakeTimers();
    render(<App services={fakes().services} />);
    fireEvent.click(screen.getByRole("button", { name: "Load an example with a bug" }));
    await settle();
    expect((screen.getByLabelText("Python code") as HTMLTextAreaElement).value).toContain("def average");
    expect(polite().textContent).toMatch(/^Example loaded: \d+ lines\. Press Run to try it\.$/);
  });
  it("legend lists every kind with a Play button", () => {
    render(<App services={fakes().services} />);
    fireEvent.click(screen.getByRole("button", { name: "Legend (L)" }));
    const dialog = screen.getByRole("dialog", { name: "Sound legend" });
    expect(within(dialog).getAllByRole("button", { name: /^Play .* sound$/ })).toHaveLength(11);
    expect(within(dialog).getAllByText(/^sound for legend-/)).toHaveLength(11);
  });
  it("settings persist theme and never persist speech", () => {
    const stored: Record<string, string> = {};
    render(<App services={fakes(failedRun, stored).services} />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText(/^Theme/), { target: { value: "high-contrast" } });
    fireEvent.click(screen.getByLabelText("Speech"));
    expect(document.documentElement.dataset.theme).toBe("high-contrast");
    const saved = JSON.parse(stored[SETTINGS_KEY]);
    expect(saved.theme).toBe("high-contrast");
    expect(saved.speech).toBe(false);
  });
  it("announces the same message twice (U-28)", async () => {
    vi.useFakeTimers();
    render(<App services={fakes().services} />);
    const item = tree();
    item.focus();
    fireEvent.keyDown(item, { code: "KeyE" });
    await settle(10);
    expect(polite().textContent).toBe("");
    await settle(100);
    expect(polite().textContent).toBe("No error to go to. Run the code first.");
    fireEvent.keyDown(item, { code: "KeyE" });
    expect(polite().textContent).toBe("");
    await settle(100);
    expect(polite().textContent).toBe("No error to go to. Run the code first.");
  });
});

describe("static checks", () => {
  it("every documented key maps to a command (U-50)", () => {
    for (const row of KEY_ROWS) {
      for (const code of row.codes) {
        const event = { code, ctrlKey: false, altKey: false, metaKey: false, shiftKey: row.shift === true, repeat: false };
        expect(keyToCommand(event), `${row.keys} (${code})`).not.toBeNull();
      }
    }
  });
  it("has no animation or transition outside a reduced-motion media query (U-44)", () => {
    const css = readFileSync("src/ui/styles.css", "utf8");
    const outside = css.replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/, "");
    expect(outside).not.toMatch(/animation|transition/);
  });
  it("uses event.code, not event.key, in the UI", () => {
    for (const file of ["src/ui/panels.tsx", "src/app/App.tsx", "src/ui/commands.ts"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\bevent\.key\b|\be\.key\b/);
    }
  });
  it("lets the 320 px layout shrink: no fixed min-width on the page", () => {
    expect(readFileSync("src/ui/styles.css", "utf8")).toMatch(/body\s*{[^}]*min-width:\s*0/);
  });
});
