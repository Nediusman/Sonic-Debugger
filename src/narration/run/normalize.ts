import type { RunError, RunResult } from "../../shared/types";
import { lineCount, parseFrames, syntaxFrame } from "./traceback";

const MAX_STDOUT = 10000;
const MAX_TYPE = 200;
const MAX_MESSAGE = 1000;
const SYNTAX_TYPES = new Set(["SyntaxError", "IndentationError", "TabError"]);

export const TIMEOUT_MESSAGE = "The program ran for more than 10 seconds and was stopped";
export const UNAVAILABLE_MESSAGE = "Python could not start in this browser";

export function failure(source: string, type: string, message: string): RunResult {
  return { ok: false, source, stdout: "", error: { type, message, frames: [] } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function cap(stdout: unknown): string {
  const out = typeof stdout === "string" ? stdout : "";
  return out.length > MAX_STDOUT ? `${out.slice(0, MAX_STDOUT)}\n[output truncated]` : out;
}

function toError(raw: unknown, source: string): RunError {
  if (!isRecord(raw)) return { type: "InternalError", message: "The runner returned an unreadable error", frames: [] };
  const type = text(raw.type, MAX_TYPE) || "Error";
  const count = lineCount(source);
  const frames = SYNTAX_TYPES.has(type)
    ? [syntaxFrame(raw.lineno, count)]
    : parseFrames(text(raw.traceback, 200000), count);
  return { type, message: text(raw.message, MAX_MESSAGE), frames };
}

/** Turns whatever the worker sent into a valid RunResult (E-1, E-2, E-4 to E-7). */
export function normalizeRun(source: string, raw: unknown): RunResult {
  if (!isRecord(raw)) return failure(source, "InternalError", "The runner returned an unreadable result");
  const stdout = cap(raw.stdout);
  if (raw.error === undefined || raw.error === null) return { ok: true, source, stdout };
  return { ok: false, source, stdout, error: toError(raw.error, source) };
}
