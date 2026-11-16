import { WORD_LIMITS, speechField } from "./sanitize";

export interface ModelAnswer {
  summary: string;
  cause: string;
  suggestedFix: string;
}

/**
 * Post-check for a model reply (E-25, E-29). Accepts only an object with
 * non-empty string fields; extra fields, including `location`, are dropped.
 */
export function checkAnswer(value: unknown): ModelAnswer | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const fields = ["summary", "cause", "suggestedFix"] as const;
  const out = { summary: "", cause: "", suggestedFix: "" };
  for (const key of fields) {
    const raw = Object.hasOwn(record, key) ? record[key] : undefined;
    if (typeof raw !== "string") return null;
    out[key] = speechField(raw, WORD_LIMITS[key]);
    if (out[key] === "") return null;
  }
  return out;
}
