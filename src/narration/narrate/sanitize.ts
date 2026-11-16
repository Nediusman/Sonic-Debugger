/** Word limits for text read aloud (E-16). */
export const WORD_LIMITS = { summary: 20, cause: 30, suggestedFix: 30 } as const;

const CONTROL = /[\u0000-\u001f\u007f]/g;
const PATH = /(?:[A-Za-z]:)?\.{0,2}[\\/](?:[^\s\\/]+[\\/])+([^\s\\/]+)/g;
const FORBIDDEN = /[`*#<>{}]/g;

/** Makes text safe to read aloud: one line, no markdown characters, file names only (E-17). */
export function toSpeech(text: string): string {
  return text
    .replace(CONTROL, " ")
    .replace(PATH, "$1")
    .replace(FORBIDDEN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts at a word boundary. Expects text already passed through toSpeech. */
export function limitWords(text: string, max: number): string {
  const words = text.split(" ").filter((word) => word !== "");
  if (words.length <= max) return text;
  const cut = words.slice(0, max).join(" ").replace(/[,;:\-\u2013]+$/, "");
  return /[.!?]$/.test(cut) ? cut : `${cut}.`;
}

export function speechField(text: string, maxWords: number): string {
  return limitWords(toSpeech(text), maxWords);
}
