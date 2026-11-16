import type { ModelClient } from "./handler";

export interface ModelEnv {
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
}

export const MODEL_TIMEOUT_MS = 4000;
const MAX_TOKENS = 200;

function contentOf(json: unknown): string {
  const choices = (json as { choices?: { message?: { content?: unknown } }[] } | null)?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("no content");
  return content;
}

/**
 * Client for any OpenAI-compatible chat completions endpoint. The key is read
 * here and sent only to the configured base URL.
 */
export function createChatClient(
  env: ModelEnv,
  fetchFn: typeof fetch = fetch,
  timeoutMs: number = MODEL_TIMEOUT_MS,
): ModelClient {
  return async (prompt) => {
    const { LLM_API_KEY: key, LLM_BASE_URL: base, LLM_MODEL: model } = env;
    if (!key || !base || !model) throw new Error("not configured");
    const response = await fetchFn(`${base.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error("model error");
    return contentOf(await response.json());
  };
}
