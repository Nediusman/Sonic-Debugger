# Narration module

Runs the user's Python in Pyodide (Web Worker), then turns a failure into four
short spoken-ready sentences and the tree node where it happened.

## API (`src/narration/index.ts`)

- `runCode(source): Promise<RunResult>`: never rejects. Runs are queued, one at
  a time. Stops after 10 s with `TimeoutError`. `input()` raises `EOFError`.
- `narrate(run, tree): Promise<NarrationResult>`: never rejects. Tries the
  route for 5 s, else uses the offline encyclopedia (`offline: true`).
  `location` and `nodeId` always come from the run, never the model.
- `onRuntimeStatus(cb)`: `idle | loading | ready | failed`. Calls back at once.
  Returns an unsubscribe function.
- `preloadRuntime()`: starts loading Python. Safe to call twice.

For the error cue, the UI takes the line of the last frame in
`run.error.frames` (or 1) and calls `sonifyError`.

## Route

`POST /api/narrate` (`api/narrate.ts`, logic in `route/handler.ts`).

Request: `{errorType, message, frames[{file,line,fn}], snippet[]}`. Limits: type
200 characters, message 500, 20 frames, 11 snippet lines of 200 characters.

Answers: `200 {summary, cause, suggestedFix}`, `400 {error: "invalid request"}`,
`429`, `502`. The client reads the URL from `VITE_NARRATE_URL` (default
`/api/narrate`).

Environment variables (server only, see `.env.example`): `LLM_API_KEY`,
`LLM_BASE_URL`, `LLM_MODEL`, optional `ALLOWED_ORIGIN`. Never prefix them with
`VITE_`.

The runtime prompt is in `prompt.ts`.

## Run offline

Without the route (plain `vite dev`) the fetch fails and `narrate` returns the
encyclopedia text. No key is needed. Python itself loads from the Pyodide CDN
on first run, so the first run needs internet.

## Test

    npx vitest run src/narration

Pyodide and the model are mocked. `run/harness.python.test.ts` runs the Python
harness under the local `python3` and is skipped when it is missing.
