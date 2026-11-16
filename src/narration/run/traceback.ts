import type { RunFrame } from "../../shared/types";

export const USER_FILE = "main.py";
const FRAME = /^[ \t]*File "([^"\n]*)", line (\d+), in (.*)$/gm;

export function lineCount(source: string): number {
  return source.split(/\r\n|\r|\n/).length;
}

export function clampLine(line: number, count: number): number {
  if (!Number.isFinite(line)) return 1;
  return Math.min(Math.max(Math.trunc(line), 1), count);
}

/** User frames (file main.py) from `traceback.format_tb` text, outermost first (E-5, E-6). */
export function parseFrames(text: string, count: number): RunFrame[] {
  const frames: RunFrame[] = [];
  for (const match of text.matchAll(FRAME)) {
    if (match[1] !== USER_FILE) continue;
    frames.push({ file: USER_FILE, line: clampLine(Number(match[2]), count), fn: match[3].trim() || "<module>" });
  }
  return frames;
}

/** One frame at the reported line for syntax errors (E-7). */
export function syntaxFrame(line: unknown, count: number): RunFrame {
  const value = typeof line === "number" ? line : 1;
  return { file: USER_FILE, line: clampLine(value, count), fn: "<module>" };
}
