# Narration assumptions

Decisions taken for the narration module because the user approved the spec and
asked to build now. Each one can be changed later.

## Answers to open questions

- **Q-E1 Provider and host.** `api/narrate.ts` is a generic Vercel-style
  handler (`req`, `res`, `res.status().json()`). It calls any OpenAI-compatible
  `POST {LLM_BASE_URL}/chat/completions`. Only env vars configure it:
  `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`. No provider is hard-coded. The key
  is read on the server and never sent to the browser. Rate limit: 10 calls per
  minute per client address, kept in memory. Each serverless instance counts on
  its own, so the real limit can be higher on a busy deployment. A shared store
  is the fix if that matters.
- **Q-E2 Privacy.** The client sends only the failing line and up to 5 lines on
  each side (at most 11 lines, 200 characters each), plus the error type,
  message and frames. It never sends the full source. There is no opt-in
  setting, because the spec has none and contracts.md has no such feature. The
  user should know that up to 11 lines of their code go to the configured model
  provider, and that when the route is missing or fails, nothing is sent and
  the offline encyclopedia is used. A UI consent toggle would be a new feature
  and needs the spec to add it.
- **Q-E3 Word limits.** summary 20, cause 30, suggestedFix 30, as proposed.
- **Q-E4 Timeouts.** Run limit 10,000 ms, model wait 5,000 ms, as proposed.
- **Q-E5 Pyodide.** Loaded from the official CDN
  (`https://cdn.jsdelivr.net/pyodide/v0.27.7/full/`) inside a module Web Worker
  by dynamic import. It is not in `package.json`. Tests never load it.
- **Q-E6 stdout and stderr.** One merged stream, in print order.
- **Q-E7 Successful run.** `narrate` returns the E-14 result and makes no
  network call.
- **Q-E8 File name.** Frames use `main.py`; the UI should not show it.

## Assumptions I added

- The run limit starts when Python starts the code, not when loading starts, so
  a slow first download is not reported as a timeout.
- Loading Python gives up after 60,000 ms and reports `RuntimeUnavailable`. The
  number is mine.
- A worker that errors, fails to load, or returns an unreadable result is
  replaced on the next run. An unreadable result gives `InternalError`, which
  uses the generic encyclopedia entry.
- `onRuntimeStatus` calls the callback immediately with the current status, so
  a late subscriber is not blind.
- Error `type` is capped at 200 characters and `message` at 1,000 when read from
  the worker.
- `SystemExit` (for example `sys.exit(0)`) counts as a finished run.
- `TabError` is treated like `SyntaxError` and `IndentationError` (one frame).
- The route answers 400 for a wrong method and for an oversized body (16,000
  characters), as E-27 lists them as invalid requests. `OPTIONS` answers 204.
  CORS headers are sent only when `ALLOWED_ORIGIN` is set (A-E5).
- The client address comes from the first `x-forwarded-for` value. That is
  trustworthy only behind a host that sets the header itself, as Vercel does.

## Deviations from the spec text

- **Prompt shape.** The runtime prompt asks for four sentences. The route asks
  the model for JSON with `summary`, `location`, `cause`, `suggestedFix` (one
  sentence each) and throws `location` away, so E-26 holds and the route
  response has exactly three fields (E-25). E-29 says to request exactly three
  fields. I kept the agreed four-sentence prompt instead.
- **"Enclosing structure".** The route request has no code tree (E-24 fixes its
  shape), so the structure is the innermost frame's function name, or "the top
  level of the file". Loops cannot be named.
- **Test location.** The route logic and its tests live in
  `src/narration/route/` because `tsconfig`, vitest and eslint only cover
  `src/` and `tests/`, which I may not change. `api/narrate.ts` is a thin
  adapter with no test of its own, so the spec's `api/narrate.test.ts` does not
  exist.
- **Root README.** Not edited. Narration docs are in `src/narration/README.md`.

## Risks

- `pyodide.http` and `import js` let user code make network requests from the
  worker. Not blocked.
- Whether the quality of the model's answers is good for blind users has not
  been evaluated; no real model was called.
