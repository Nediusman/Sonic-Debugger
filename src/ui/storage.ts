import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from "./state";

export type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

export const SETTINGS_KEY = "sonic-debugger.settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T>(value: unknown, fallback: T, valid: (v: unknown) => boolean): T {
  return valid(value) ? (value as T) : fallback;
}

const isBool = (v: unknown): boolean => typeof v === "boolean";
const isNumber = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v);
const isTheme = (v: unknown): boolean => v === "default" || v === "high-contrast";

/** Speech is never restored: it is off at every start (Q-U3). */
export function parseSettings(raw: unknown, defaults: Settings): Settings {
  if (!isRecord(raw)) return defaults;
  return normalizeSettings({
    volume: pick(raw.volume, defaults.volume, isNumber),
    reducedSound: pick(raw.reducedSound, defaults.reducedSound, isBool),
    speech: false,
    speechRate: pick(raw.speechRate, defaults.speechRate, isNumber),
    theme: pick(raw.theme, defaults.theme, isTheme),
    reduceMotion: pick(raw.reduceMotion, defaults.reduceMotion, isBool),
    dontShowWelcome: pick(raw.dontShowWelcome, defaults.dontShowWelcome, isBool),
  });
}

/** Never throws: missing, throwing or garbage storage gives the defaults. */
export function loadSettings(storage: SettingsStorage | null, defaults: Settings = DEFAULT_SETTINGS): Settings {
  try {
    const text = storage?.getItem(SETTINGS_KEY);
    return text ? parseSettings(JSON.parse(text), defaults) : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(storage: SettingsStorage | null, settings: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, speech: false }));
  } catch {
    // Storage is full, blocked or missing: the settings last for this visit only.
  }
}
