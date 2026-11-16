import type { RunError, RunFrame } from "../../shared/types";
import { type ModelAnswer, checkAnswer } from "./answer";

export const MODEL_TIMEOUT_MS = 5000;
const CONTEXT_LINES = 5;
const MAX_LINE_CHARS = 200;
const MAX_FRAMES = 20;
const MAX_RESPONSE_CHARS = 20000;

function routeUrl(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_NARRATE_URL || "/api/narrate";
}

/** The failing line plus up to 5 lines on each side, each cut to 200 characters (E-24). */
export function codeWindow(source: string, line: number | null): string[] {
  if (line === null) return [];
  const lines = source.split(/\r\n|\r|\n/);
  const start = Math.max(1, line - CONTEXT_LINES);
  const end = Math.min(lines.length, line + CONTEXT_LINES);
  const out: string[] = [];
  for (let n = start; n <= end; n++) out.push(lines[n - 1].slice(0, MAX_LINE_CHARS));
  return out;
}

function requestFrames(frames: RunFrame[]): RunFrame[] {
  return frames
    .filter((f) => Number.isSafeInteger(f?.line) && f.line >= 1 && typeof f.file === "string" && typeof f.fn === "string")
    .slice(-MAX_FRAMES)
    .map((f) => ({ file: f.file.slice(0, MAX_LINE_CHARS), line: f.line, fn: f.fn.slice(0, MAX_LINE_CHARS) }));
}

export function buildRequestBody(error: RunError, source: string, line: number | null): string {
  return JSON.stringify({
    errorType: String(error.type).slice(0, 200),
    message: String(error.message).slice(0, 500),
    frames: requestFrames(Array.isArray(error.frames) ? error.frames : []),
    snippet: codeWindow(source, line),
  });
}

async function ask(body: string, signal: AbortSignal): Promise<ModelAnswer | null> {
  try {
    const response = await fetch(routeUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length > MAX_RESPONSE_CHARS ? null : checkAnswer(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Asks the route for an explanation. Resolves null on any failure or after 5 seconds (E-23, E-25, E-30). */
export function fetchModelAnswer(error: RunError, source: string, line: number | null): Promise<ModelAnswer | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, MODEL_TIMEOUT_MS);
  });
  return Promise.race([ask(buildRequestBody(error, source, line), controller.signal), timeout]).finally(() =>
    clearTimeout(timer),
  );
}
