import { type ModelAnswer, checkAnswer } from "../narrate/answer";
import { buildPrompt } from "../prompt";
import type { RateLimiter } from "./rateLimit";
import { type NarrateRequest, parseRequest } from "./validate";

export interface ApiInput {
  method: string;
  bodyText: string | null;
  clientKey: string;
}

export interface ApiOutput {
  status: number;
  body: Record<string, string>;
}

/** Sends the prompt to a model and returns its raw text reply. Throws on failure. */
export type ModelClient = (prompt: { system: string; user: string }) => Promise<string>;

export interface HandlerDeps {
  callModel: ModelClient;
  limiter: RateLimiter;
}

const INVALID: ApiOutput = { status: 400, body: { error: "invalid request" } };

function promptFor(request: NarrateRequest): { system: string; user: string } {
  const last = request.frames.at(-1);
  const where = last?.fn === "<module>" ? "the top level of the file" : `function ${last?.fn}`;
  return buildPrompt({
    errorType: request.errorType,
    errorMessage: request.message,
    line: last ? String(last.line) : "unknown",
    enclosingStructure: last ? where : "unknown",
    codeWindow: request.snippet.join("\n"),
    tracebackSummary: request.frames.map((f) => `line ${f.line} in ${f.fn} (${f.file})`).join("; ") || "none",
  });
}

/** Finds the JSON object in a model reply, which may have text or fences around it. */
export function extractJson(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function explain(request: NarrateRequest, callModel: ModelClient): Promise<ModelAnswer | null> {
  const reply = await callModel(promptFor(request));
  return checkAnswer(extractJson(reply));
}

/** Platform-independent route logic (E-27 to E-31). Logs nothing. */
export async function handleNarrate(input: ApiInput, deps: HandlerDeps): Promise<ApiOutput> {
  if (input.method !== "POST") return INVALID;
  if (!deps.limiter.allow(input.clientKey)) return { status: 429, body: { error: "too many requests" } };
  const request = parseRequest(input.bodyText);
  if (!request) return INVALID;
  try {
    const answer = await explain(request, deps.callModel);
    if (!answer) return { status: 502, body: { error: "unusable model answer" } };
    return { status: 200, body: { summary: answer.summary, cause: answer.cause, suggestedFix: answer.suggestedFix } };
  } catch {
    return { status: 502, body: { error: "model unavailable" } };
  }
}
