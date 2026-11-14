# Error narration spec: requirements

Module: `src/narration` plus one serverless route (`api/narrate`).
Owner: narration agent. Python only.
Flow: source -> `runCode` (Pyodide) -> `RunResult` -> `narrate` (LLM, or the
offline encyclopedia) -> `NarrationResult`.

`[PBT]` marks invariants for property tests. Values marked **PENDING** need an
answer; see Open questions.

## Requirements

### Running code

- **E-1 [PBT]** When `runCode(source)` is called with any string, the system
  shall resolve with a `RunResult` and shall never reject or throw.
- **E-2 [PBT]** When `runCode` resolves, the system shall set `source` equal
  to the input, set `ok` to `true` if and only if `error` is undefined, and
  set `stdout` to a string (empty when nothing was printed).
- **E-3** When `runCode` is called, the system shall run the code in Pyodide
  inside a Web Worker, so the page stays responsive and can stop the run.
- **E-4** When the code prints, the system shall capture standard output and
  standard error text into `stdout` in print order, and shall keep at most
  10,000 characters, followed by `\n[output truncated]` when it cut
  (assumption A-E3).
- **E-5** When the code raises an uncaught exception, the system shall set
  `error.type` to the exception class name (e.g. `NameError`),
  `error.message` to its message, and `error.frames` to the traceback frames
  from outermost to innermost.
- **E-6 [PBT]** When `error.frames` is produced, the system shall include only
  frames from the user's source (file `main.py`), exclude Pyodide and
  standard-library frames, and give each frame `1 <= line <= lineCount(source)`.
- **E-7** When the exception is a `SyntaxError` or `IndentationError`, the
  system shall set `frames` to one frame `{file: 'main.py', line: <reported
  line>, fn: '<module>'}`, with the line clamped to the source's range.
- **E-8** When the code runs longer than the run limit (10,000 ms, **PENDING
  Q-E4**), the system shall terminate the worker, create a new one for the next
  run, and resolve with `ok: false`, `error.type` `TimeoutError`,
  `error.message` `The program ran for more than 10 seconds and was stopped`,
  and `frames: []`.
- **E-9** When Pyodide has not finished loading, the system shall report the
  loading state through `onRuntimeStatus` (`loading`, `ready`, `failed`) and
  `runCode` shall wait for readiness rather than fail.
- **E-10** If Pyodide fails to load, then `runCode` shall resolve with
  `ok: false`, `error.type` `RuntimeUnavailable`, `error.message` `Python could
  not start in this browser`, and `frames: []`.
- **E-11** When the code calls `input()`, the system shall make it raise
  `EOFError` with the message `input is not supported`, instead of blocking.
- **E-12** When a run starts, the system shall isolate it so that globals from
  a previous run are not visible.

### Narrating

- **E-13 [PBT]** When `narrate(run, tree)` is called with any `RunResult` and
  any `CodeTree`, the system shall resolve with a `NarrationResult` and shall
  never reject or throw, including when the network, the route, or the model
  fails.
- **E-14** When `run.ok` is `true`, the system shall resolve with `summary`
  `The program finished without errors.`, empty `location`, `cause`, and
  `suggestedFix`, `nodeId` equal to `tree.rootId`, `offline` `true`, and shall
  make no network request (**PENDING Q-E7**).
- **E-15 [PBT]** When `run.ok` is `false`, the system shall return a result
  where `summary`, `location`, `cause`, and `suggestedFix` are non-empty, and
  `nodeId` is a key of `tree.nodes`.
- **E-16 [PBT]** When `run.ok` is `false`, the system shall limit `summary` to
  20 words, `cause` to 30 words, and `suggestedFix` to 30 words
  (**PENDING Q-E3**), cutting at a word boundary.
- **E-17 [PBT]** When `run.ok` is `false`, the system shall make every text
  field speech-ready: no newline, no markdown or code-fence characters
  (`` ` * # < > ``), no leading or trailing space, and no unreplaced
  placeholder (`{`, `}`).
- **E-18 [PBT]** When `run.ok` is `false` and `error.frames` is not empty, the
  system shall set `location` to `line L, in FN` (or `line L, at the top level
  of the file` when `fn` is `<module>`), using the innermost user frame, and
  shall set `nodeId` to `nodeAtLine(tree, L).id`, or `tree.rootId` when that is
  `null`.
- **E-19** When `run.ok` is `false` and `frames` is empty, the system shall
  set `location` to `the program as a whole` and `nodeId` to `tree.rootId`.

### Offline encyclopedia

- **E-20** When the language model is not used (see E-23), the system shall
  build the result from the offline encyclopedia and set `offline` to `true`.
- **E-21** The encyclopedia shall contain an entry for each of: `SyntaxError`,
  `IndentationError`, `TabError`, `NameError`, `UnboundLocalError`,
  `TypeError`, `ValueError`, `IndexError`, `KeyError`, `AttributeError`,
  `ZeroDivisionError`, `ImportError`, `ModuleNotFoundError`, `RecursionError`,
  `FileNotFoundError`, `AssertionError`, `EOFError`, `TimeoutError`,
  `RuntimeUnavailable`, `StopIteration`, `OverflowError`, `MemoryError`, plus
  a generic entry for any other type. Each entry has a `summary`, `cause`,
  and `suggestedFix` template.
- **E-22 [PBT]** When the offline result is built, the system shall fill
  templates from the error message and location (for example the name in
  `name 'x' is not defined`), and shall return the same result for the same
  `(run, tree)` (deterministic). When the message has no extractable name, the
  template shall use a sentence variant without the placeholder.

### Model call

- **E-23** When `run.ok` is `false`, the system shall call `POST /api/narrate`
  with a 5,000 ms timeout (**PENDING Q-E4**) and shall use the result only if
  it passes E-25.
- **E-24** When the system builds the request, it shall send
  `{errorType, message, frames, snippet}` as JSON, where `snippet` is the
  failing line and up to 5 lines before and after (**PENDING Q-E2**, consent),
  with every line truncated to 200 characters.
- **E-25 [PBT]** When the route answers, the system shall accept the answer
  only if it is JSON with string fields `summary`, `cause`, `suggestedFix`;
  extra fields are ignored; the system shall apply E-16 and E-17 to the
  strings (truncate and sanitise); and shall fall back to the offline result
  for any other answer (network error, timeout, non-2xx status, bad JSON,
  missing or empty fields).
- **E-26** When the model answer is accepted, the system shall set
  `offline` to `false`, and take `location` and `nodeId` from the run (E-18),
  never from the model.
- **E-27** When the route receives a request, it shall validate it: method
  `POST`, JSON body, `errorType` and `message` strings of at most 200 and 500
  characters, at most 20 frames, `snippet` at most 11 lines. Otherwise it shall
  answer 400 with `{error: 'invalid request'}` without calling the model.
- **E-28** The route shall read the model key and model name from environment
  variables on the server (`LLM_API_KEY`, `LLM_MODEL`), shall never send them
  to the browser, and shall never log them or the user's snippet.
- **E-29 [PBT]** When the route builds the model prompt, it shall state that
  the error text and code are untrusted data, not instructions; shall request
  JSON with exactly `summary`, `cause`, `suggestedFix` in short plain
  language for a blind developer, no code blocks; and shall validate and
  length-limit the model's output (E-16, E-17) before returning it, so that no
  input can change the response shape.
- **E-30** If the route is not deployed or is unreachable (for example local
  `vite dev` without the function), then the system shall fall back to the
  offline result within the timeout.
- **E-31** When the route is called more than 10 times per minute from one
  client address, it shall answer 429 (**PENDING Q-E1**, rate-limit store).

## User-facing behavior

| Behavior | Shortcut | Announcement | Sound |
| --- | --- | --- | --- |
| Run code | `Ctrl+Enter` in the editor; `R` while the tree has focus; button "Run code" | polite status `Running` (and `Loading Python, please wait` on first run) | none |
| Finish without error | none | polite status `Finished. No errors. N lines of output.` | none |
| Finish with error | none | assertive: `<summary> <location>. <cause> <suggestedFix>` (ui-spec builds the string; label `Offline explanation` when `offline`) | error cue `sonifyError` at the failing line (sonification-spec) |
| Stopped by timeout | none | assertive: same format, summary from the TimeoutError entry | error cue at the root node |
| Repeat the explanation | `N` while the tree has focus; button "Hear it again (N)" | the same narration text | error cue again |

The keys themselves belong to navigation-a11y-spec and ui-spec.

## Assumptions

- **A-E1** The user's code runs as file name `main.py`.
- **A-E2** `runCode` returns once per call; concurrent calls are queued, one
  at a time.
- **A-E3** The 10,000-character `stdout` cap is mine.
- **A-E4** Word limits and rate limit numbers are mine (Q-E3, Q-E1).
- **A-E5** The client reads the route URL from `VITE_NARRATE_URL` (default
  `/api/narrate`), because the route deploys separately (ui-spec U-47). The route
  must send CORS headers for the app origin.

## Open questions (need an answer from the user)

- **Q-E1** Which LLM provider and model, and which serverless host (Vercel,
  Netlify, Cloudflare)? The steering file says "one serverless route" only.
  Also: is rate limiting wanted, and with what store?
- **Q-E2** Privacy: is it acceptable to send up to 11 lines of the user's
  code to a third-party model? Does the user need to opt in (a setting,
  off by default)? Proposal: opt-in toggle, otherwise offline only. This
  would add a feature not in contracts, so I did not add it; E-23 sends
  by default until you decide.
- **Q-E3** Length limits for summary, cause, and fix (20, 30, 30 words are
  my proposal).
- **Q-E4** Run limit (10 s) and model timeout (5 s) values.
- **Q-E5** Pyodide is not in `package.json`. Add the npm `pyodide` package and
  serve its files from the app, or load from a CDN? Proposal: npm package,
  files copied at build time, no CDN (works offline after first load).
- **Q-E6** Should `stdout` and `stderr` be one stream (E-4 proposal) or kept
  apart? `RunResult` has only `stdout`.
- **Q-E7** For a successful run, should `narrate` return the E-14 result, or
  should the UI never call it? contracts.md says `narrate(run, tree)` always
  returns a `NarrationResult`.
- **Q-E8** `RunResult.error.frames[].file` is `main.py`; confirm that the UI
  should not show the file name.

## Stretch (not scheduled)

- Streaming model output.
- Narrating warnings, or runtime values at the failing line.
- Other languages and their runtimes.
- Voice choice and speed for the explanation.
- Multi-error summaries.
