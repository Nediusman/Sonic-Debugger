# Error narration spec: tasks

Order: slice 1 (E-T1 to E-T4) turns a failed run into a spoken-ready
explanation using only the offline encyclopedia, with no network and no
Pyodide yet (a stub runner), so the UI can demo the full error flow early.
Tick a task only when its code, tests, `npm run typecheck`, `npm test`, and
`npm run lint:a11y` pass. Commit prefix: `feat(narration):`,
`test(narration):`.

Questions that block tasks: E-T7 (Q-E5), E-T9 and E-T10 (Q-E1, Q-E2, Q-E3),
E-T5 wording review.

## Slice 1: smallest end-to-end

- [x] **E-T1 Shared types.** Add `RunFrame`, `RunError`, `RunResult`,
  `NarrationResult` to `src/shared/types.ts` as in design.md (explicitly
  allowed). Reqs: E-2, E-15.
- [x] **E-T2 Location.** `narrate/location.ts`: innermost user frame to
  `location` string and `nodeId` via parser `nodeAtLine`, with the root
  fallback. Fixture trees as literals. Reqs: E-18, E-19.
- [x] **E-T3 Sanitise.** `narrate/sanitize.ts`: word limit, speech-ready text.
  Reqs: E-16, E-17.
- [x] **E-T4 Offline narrate.** `encyclopedia.ts` with entries for
  `NameError`, `ZeroDivisionError`, `TypeError`, `IndexError`, `KeyError`,
  `SyntaxError` and the generic entry; `narrate.ts` using it with no
  network; success result for `ok: true`. Export `narrate` from `index.ts`.
  Reqs: E-13, E-14, E-15, E-20, E-22.

Handoff after E-T4: the UI agent can wire the error panel with a stub
`runCode` that returns canned `RunResult`s.

## Slice 2: real execution

- [ ] **E-T5 Complete the encyclopedia.** Remaining entries from E-21; the
  user reviews the wording. Reqs: E-21, E-22.
- [x] **E-T6 Traceback parsing.** `run/traceback.ts` from Python traceback
  text and `SyntaxError` attributes to `RunFrame[]`, user frames only, line
  clamping. Stored samples. Reqs: E-5, E-6, E-7.
- [x] **E-T7 Worker and runner.** Add the `pyodide` dependency (needs Q-E5),
  `worker.ts`, `runner.ts`, `protocol.ts`: load once, run, capture stdout and
  stderr, `input()` -> `EOFError`, fresh globals per run, queue.
  Reqs: E-1, E-2, E-3, E-4, E-9, E-11, E-12, A-E2.
- [x] **E-T8 Timeout and failure.** Kill and replace the worker on timeout;
  `RuntimeUnavailable` when loading fails; `onRuntimeStatus`,
  `preloadRuntime`. Reqs: E-8, E-9, E-10.

## Slice 3: the model

- [x] **E-T9 Route.** `api/narrate.ts`: validation, prompt with the
  untrusted-data statement, env key, output validation and limits, 400/429/502
  answers, no body logging; `.env.example`. Needs Q-E1 and Q-E3.
  Reqs: E-27, E-28, E-29, E-31.
- [x] **E-T10 Client.** `narrate/client.ts`: request building (snippet),
  5 s timeout, answer validation, fallback to offline; wire into `narrate`.
  Needs Q-E2. Reqs: E-23, E-24, E-25, E-26, E-30.

## Slice 4: quality

- [x] **E-T11 Property tests.** `narration.property.test.ts` for NP-1 to
  NP-10, generators for tracebacks, sources, model answers; regression
  fixtures; log findings in `docs/pbt-findings.md`. Reqs: all [PBT].
- [x] **E-T12 Docs.** `src/narration/README.md`: API, route contract,
  environment variables, how to run offline.

## Stretch (not scheduled)

- Streaming answers.
- Narrating runtime values.
- Other language runtimes.
