import type { NarrationResult, ParseIssue } from "../shared/types";

export const MAX_MESSAGE_CHARS = 400;
const BANNED = /[`*#<>{}[\]|\\]/g;

/** Single line, no markup characters, at most `max` characters. */
export function clean(text: string, max: number = MAX_MESSAGE_CHARS): string {
  const flat = String(text).replace(BANNED, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max).trimEnd() : flat;
}

function sentence(text: string): string {
  const flat = clean(text);
  if (flat === "") return "";
  return /[.!?]$/.test(flat) ? flat : `${flat}.`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function whole(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function openedMessage(name: string, lines: number, constructs: number): string {
  const label = clean(name, 100) || "file";
  return clean(
    `Opened ${label}, ${plural(whole(lines), "line")}. Structure ready: ${plural(whole(constructs), "construct")}. Press P to hear the overview.`,
  );
}

export function exampleMessage(lines: number): string {
  return `Example loaded: ${plural(whole(lines), "line")}. Press Run to try it.`;
}

export function structureMessage(constructs: number, issues: ParseIssue[]): string {
  const base = `Structure updated, ${plural(whole(constructs), "construct")}`;
  if (issues.length === 0) return base;
  const first = issues[0];
  const detail = clean(first.message, 150) || "syntax problem";
  return clean(`${base}, ${plural(issues.length, "syntax issue")}. First: line ${whole(first.line)}, ${detail}`);
}

export function finishedMessage(stdout: string): string {
  const text = String(stdout);
  if (text === "") return "Finished. No errors. No output.";
  const lines = text.replace(/\n$/, "").split("\n").length;
  return `Finished. No errors. ${plural(lines, "line")} of output.`;
}

const ERROR_SUFFIX = "Press E to go to the failing construct.";

/** The assertive text of U-16: summary, location, cause, fix, then the key hint. */
export function errorMessage(n: NarrationResult): string {
  const location = clean(n.location).replace(/[.!?]+$/, "");
  const parts = [
    sentence(n.summary),
    location === "" ? "" : `${location}.`,
    sentence(n.cause),
    sentence(n.suggestedFix),
  ].filter((p) => p !== "");
  const room = MAX_MESSAGE_CHARS - ERROR_SUFFIX.length - 1;
  const body = clean(parts.join(" "), room);
  return body === "" ? ERROR_SUFFIX : `${body} ${ERROR_SUFFIX}`;
}

/** The explanation without the key hint, for "Hear it again". */
export function explanationMessage(n: NarrationResult): string {
  const location = clean(n.location).replace(/[.!?]+$/, "");
  const parts = [sentence(n.summary), location === "" ? "" : `${location}.`, sentence(n.cause), sentence(n.suggestedFix)];
  return clean(parts.filter((p) => p !== "").join(" ")) || "No explanation yet. Run the code.";
}

export function lineProblemMessage(input: string, lineCount: number): string {
  const count = Math.max(1, whole(lineCount));
  const typed = clean(input, 40);
  const range = count === 1 ? "The only line is 1" : `Enter a line number from 1 to ${count}`;
  return typed === "" ? `${range}.` : `${typed} is not a line in this file. ${range}.`;
}

export function toggleMessage(name: "Speech" | "Reduced sound", on: boolean): string {
  return `${name} ${on ? "on" : "off"}`;
}

export function openFailedMessage(name: string, reason: string): string {
  return clean(`Could not open ${clean(name, 100) || "file"}: ${clean(reason, 200) || "unknown reason"}`);
}
