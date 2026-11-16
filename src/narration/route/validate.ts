import type { RunFrame } from "../../shared/types";

export interface NarrateRequest {
  errorType: string;
  message: string;
  frames: RunFrame[];
  snippet: string[];
}

export const MAX_BODY_CHARS = 16000;
const MAX_TYPE = 200;
const MAX_MESSAGE = 500;
const MAX_FRAMES = 20;
const MAX_SNIPPET_LINES = 11;
const MAX_LINE_CHARS = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringUpTo(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function toFrame(value: unknown): RunFrame | null {
  if (!isRecord(value)) return null;
  const { file, line, fn } = value;
  if (!stringUpTo(file, MAX_LINE_CHARS) || !stringUpTo(fn, MAX_LINE_CHARS)) return null;
  if (typeof line !== "number" || !Number.isSafeInteger(line) || line < 1) return null;
  return { file, line, fn };
}

function toFrames(value: unknown): RunFrame[] | null {
  if (!Array.isArray(value) || value.length > MAX_FRAMES) return null;
  const frames = value.map(toFrame);
  return frames.every((frame) => frame !== null) ? frames : null;
}

function toSnippet(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_SNIPPET_LINES) return null;
  return value.every((line) => stringUpTo(line, MAX_LINE_CHARS)) ? (value as string[]) : null;
}

/** Parses and checks a request body (E-27). Returns null for anything invalid. */
export function parseRequest(bodyText: string | null): NarrateRequest | null {
  if (bodyText === null || bodyText.length > MAX_BODY_CHARS) return null;
  let value: unknown;
  try {
    value = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { errorType, message } = value;
  if (!stringUpTo(errorType, MAX_TYPE) || errorType === "" || !stringUpTo(message, MAX_MESSAGE)) return null;
  const frames = toFrames(value.frames);
  const snippet = toSnippet(value.snippet);
  return frames && snippet ? { errorType, message, frames, snippet } : null;
}
