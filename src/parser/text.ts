const MAX_NAME = 40;
// Characters that must never reach speech output (P-22), plus ( ) and :
// so call names stay plain (decision on the P-22 / N-16 mismatch).
const UNSAFE = /[`*#<>{}[\]|\\()":]|\p{Cc}/gu;

/** Makes a source fragment safe and short enough to speak. */
export function cleanName(raw: string): string | undefined {
  const text = raw
    .replace(UNSAFE, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_NAME)
    .trim();
  return text === "" ? undefined : text;
}

export function normaliseLineEndings(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}
