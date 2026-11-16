import type { CodeTree, NarrationResult, RunError, RunResult } from "../../shared/types";
import { fetchModelAnswer } from "./client";
import { offlineText } from "./encyclopedia";
import { type Located, locate } from "./location";
import { WORD_LIMITS, speechField, toSpeech } from "./sanitize";

const SUCCESS_SUMMARY = "The program finished without errors.";
const UNKNOWN_ERROR: RunError = { type: "", message: "", frames: [] };

function success(tree: CodeTree): NarrationResult {
  return { summary: SUCCESS_SUMMARY, location: "", cause: "", suggestedFix: "", nodeId: tree.rootId, offline: true };
}

function offlineResult(error: RunError, located: Located): NarrationResult {
  const text = offlineText(error, located.line);
  return {
    summary: speechField(text.summary, WORD_LIMITS.summary),
    location: toSpeech(located.location),
    cause: speechField(text.cause, WORD_LIMITS.cause),
    suggestedFix: speechField(text.suggestedFix, WORD_LIMITS.suggestedFix),
    nodeId: located.nodeId,
    offline: true,
  };
}

async function narrateFailure(run: RunResult, tree: CodeTree): Promise<NarrationResult> {
  const error = run.error ?? UNKNOWN_ERROR;
  const located = locate(error, tree);
  const offline = offlineResult(error, located);
  const answer = await fetchModelAnswer(error, String(run.source), located.line);
  return answer ? { ...offline, ...answer, offline: false } : offline;
}

/** Never rejects (E-13). Uses the model when it answers in time, else the offline encyclopedia. */
export async function narrate(run: RunResult, tree: CodeTree): Promise<NarrationResult> {
  try {
    return run.ok ? success(tree) : await narrateFailure(run, tree);
  } catch {
    return offlineResult(UNKNOWN_ERROR, { location: "the program as a whole", nodeId: tree?.rootId ?? "", line: null });
  }
}
