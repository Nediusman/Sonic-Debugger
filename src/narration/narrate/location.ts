import { nodeAtLine } from "../../parser";
import type { CodeTree, RunError, RunFrame } from "../../shared/types";
import { toSpeech } from "./sanitize";

export interface Located {
  location: string;
  nodeId: string;
  /** Line of the innermost usable frame, or null when there is none. */
  line: number | null;
}

const WHOLE_PROGRAM = "the program as a whole";

function usable(frame: RunFrame): boolean {
  return Number.isSafeInteger(frame?.line) && frame.line >= 1;
}

function innermost(error: RunError | undefined): RunFrame | null {
  const frames = Array.isArray(error?.frames) ? error.frames : [];
  for (let i = frames.length - 1; i >= 0; i--) if (usable(frames[i])) return frames[i];
  return null;
}

function describe(frame: RunFrame): string {
  if (frame.fn === "<module>") return `line ${frame.line}, at the top level of the file`;
  const fn = typeof frame.fn === "string" ? toSpeech(frame.fn) : "";
  return fn === "" ? `line ${frame.line}` : `line ${frame.line}, in ${fn}`;
}

/** Maps the innermost user frame to speech text and a tree node (E-18, E-19). */
export function locate(error: RunError | undefined, tree: CodeTree): Located {
  const frame = innermost(error);
  if (!frame) return { location: WHOLE_PROGRAM, nodeId: tree.rootId, line: null };
  const node = nodeAtLine(tree, frame.line);
  return { location: describe(frame), nodeId: node?.id ?? tree.rootId, line: frame.line };
}
