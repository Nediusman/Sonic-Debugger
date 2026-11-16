import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { dispatchKey } from "./keys/dispatch";
import { KEY_LIST, KEY_MAP } from "./keys/keymap";
import type { KeyLike } from "./keys/types";
import { isStopAudioKey, keyToCommand } from "./index";

const key = (code: string, extra: Partial<KeyLike> = {}): KeyLike => ({
  code, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, repeat: false, ...extra,
});

describe("keyToCommand (N-19, N-20)", () => {
  it("maps every table entry", () => {
    for (const code of Object.keys(KEY_MAP)) expect(keyToCommand(key(code))).toEqual(KEY_MAP[code]);
  });
  it("maps the arrows to intents", () => {
    expect(keyToCommand(key("ArrowRight"))).toEqual({ kind: "nav", intent: "expandOrDescend" });
    expect(keyToCommand(key("ArrowLeft"))).toEqual({ kind: "nav", intent: "collapseOrAscend" });
  });
  it("maps Shift+Slash to the key list", () => {
    expect(keyToCommand(key("Slash", { shiftKey: true }))).toEqual({ kind: "app", command: "showKeys" });
    expect(keyToCommand(key("Slash"))).toBeNull();
    expect(keyToCommand(key("Slash", { shiftKey: true, ctrlKey: true }))).toBeNull();
  });
  it("ignores reserved keys and modifiers", () => {
    for (const code of ["F6", "Insert", "CapsLock", "AltLeft", "ControlRight", "MetaLeft"]) {
      expect(keyToCommand(key(code))).toBeNull();
    }
    expect(keyToCommand(key("KeyR", { ctrlKey: true }))).toBeNull();
    expect(keyToCommand(key("KeyR", { altKey: true }))).toBeNull();
    expect(keyToCommand(key("KeyR", { metaKey: true }))).toBeNull();
    expect(keyToCommand(key("KeyR", { shiftKey: true }))).toBeNull();
    expect(keyToCommand(key("Enter", { ctrlKey: true }))).toBeNull();
  });
  it("ignores unmapped codes and object prototype names", () => {
    expect(keyToCommand(key("KeyA"))).toBeNull();
    expect(keyToCommand(key("constructor"))).toBeNull();
    expect(keyToCommand(key("Tab"))).toBeNull();
  });
});

describe("isStopAudioKey (N-25)", () => {
  it("accepts plain Escape only", () => {
    expect(isStopAudioKey(key("Escape"))).toBe(true);
    expect(isStopAudioKey(key("Escape", { ctrlKey: true }))).toBe(false);
    expect(isStopAudioKey(key("KeyS"))).toBe(false);
  });
});

describe("dispatchKey (N-21 to N-23)", () => {
  const event = (code: string, extra: Partial<KeyLike> = {}) => ({ ...key(code, extra), preventDefault: vi.fn() });
  it("runs a mapped key in the tree and prevents default", () => {
    const run = vi.fn();
    const e = event("KeyR");
    expect(dispatchKey(e, true, run)).toBe(true);
    expect(run).toHaveBeenCalledWith({ kind: "app", command: "run" });
    expect(e.preventDefault).toHaveBeenCalledOnce();
  });
  it("does nothing outside the tree", () => {
    const run = vi.fn();
    const e = event("KeyR");
    expect(dispatchKey(e, false, run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
  it("leaves unmapped keys alone", () => {
    const run = vi.fn();
    const e = event("Tab");
    dispatchKey(e, true, run);
    expect(run).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
  it("repeats only Up and Down", () => {
    const run = vi.fn();
    dispatchKey(event("ArrowDown", { repeat: true }), true, run);
    dispatchKey(event("ArrowUp", { repeat: true }), true, run);
    expect(run).toHaveBeenCalledTimes(2);
    dispatchKey(event("KeyR", { repeat: true }), true, run);
    dispatchKey(event("Home", { repeat: true }), true, run);
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("key list", () => {
  it("states that type-ahead is not supported", () => {
    expect(KEY_LIST.some((e) => e.keys === "Type-ahead" && e.action === "Not supported")).toBe(true);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("event.code only (N-24)", () => {
  it("never reads event.key in src/navigation", () => {
    const offenders = sourceFiles(__dirname).filter((f) => /\.key\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("never imports the sonification module", () => {
    const offenders = sourceFiles(__dirname).filter((f) => /sonification/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
