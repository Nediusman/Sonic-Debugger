# Error narration spec: design

## Public interfaces

Types go in `src/shared/types.ts`. Names are from contracts.md. Additions are
marked.

```ts
export interface RunFrame { file: string; line: number; fn: string }

export interface RunError {
  type: string;
  message: string;
  frames: RunFrame[];
}

export interface RunResult {
  ok: boolean;
  source: string;
  stdout: string;
  error?: RunError;
}

export interface NarrationResult {
  summary: string;
  location: string;
  cause: string;
  suggestedFix: string;
  nodeId: string;
  offline: boolean;
}
```

`RunFrame` and `RunError` only give names to the inline object types in
contracts.md (`error?: { type, message, frames: { file, line, fn }[] }`). The
shapes are identical.

```ts
// src/narration/index.ts: the only import path other modules may use
export function runCode(source: string): Promise<RunResult>;
export function narrate(run: RunResult, tree: CodeTree): Promise<NarrationResult>;

// ADDITIONS (not in contracts.md; Q-E5, E-9)
export type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'failed';
export function onRuntimeStatus(callback: (status: RuntimeStatus) => void): () => void; // returns unsubscribe
export function preloadRuntime(): void; // starts loading Pyodide; safe to call twice
```

Route contract (`api/narrate.ts`, the one serverless function):

```ts
// POST /api/narrate
interface NarrateRequest {
  errorType: string;   // <= 200 chars
  message: string;     // <= 500 chars
  frames: RunFrame[];  // <= 20
  snippet: string[];   // <= 11 lines, each <= 200 chars
}
interface NarrateResponse { summary: string; cause: string; suggestedFix: string }
// 200 NarrateResponse | 400 { error: 'invalid request' } | 429 | 502 { error }
```

## Data flow

```
source ──> runCode ──> worker (Pyodide) ──> RunResult
                                               │
                    CodeTree (from parser) ────┤
                                               v
                                   narrate(run, tree)
                                     │ ok?  yes -> success result (E-14)
                                     │ no:
                                     ├─ location + nodeId from frames + nodeAtLine (E-18)
                                     ├─ POST /api/narrate (5 s) ──> model
                                     │       valid? -> sanitise + limit -> offline:false
                                     └─ else encyclopedia(run) -> offline:true
                                               v
                                       NarrationResult ──> ui (live region, panel, TTS)
                                                       └─> ui calls sonifyError(tree, line)
```

The UI takes `line` for `sonifyError` from the innermost frame of
`run.error.frames` (or 1 if none). Narration never imports sonification.
`narrate` imports only `nodeAtLine` from the parser's public index.

## Module layout

```
src/narration/
  index.ts              public exports
  run/
    worker.ts           Web Worker: loads Pyodide, runs code, captures output
    runner.ts           main-thread side: queue, timeout, restart (E-3, E-8)
    traceback.ts        Python traceback -> RunFrame[] (E-5 to E-7)
    protocol.ts         message types between runner and worker
  narrate/
    narrate.ts          orchestration (E-13 to E-19)
    location.ts         frames -> location string, nodeId
    client.ts           fetch to /api/narrate, timeout, validation (E-23 to E-26)
    sanitize.ts         word limit, speech-ready text (E-16, E-17)
    encyclopedia.ts     entries and template filling (E-20 to E-22)
  fixtures/             sample RunResults, traces, mocked route answers
api/
  narrate.ts            serverless handler (E-27 to E-31)
  narrate.test.ts       tests with a mocked model client
```

`sanitize.ts` is shared by the client and the route through a copy-free
import (the route imports from `src/narration/narrate/sanitize.ts`; it has no
browser dependencies).

## Offline encyclopedia entry shape

```ts
interface EncyclopediaEntry {
  summary: string;       // template, e.g. "A name was used before it was defined."
  cause: string;         // may contain {name}, {line}
  suggestedFix: string;  // may contain {name}
  extract?: RegExp;      // captures {name} from error.message
}
```

Example for `NameError`: summary `A name was used that does not exist yet.`
cause `The name {name} is not defined where line {line} uses it.` fix `Check
the spelling of {name}, or define it before line {line}.` Variant without
`{name}` when `extract` finds nothing (E-22). Final wording of all entries is
written in task E-T5 and reviewed by the user.

## Independent testability

- `runCode` tests mock the Worker and Pyodide (`FakeWorker` returns canned
  `RunResult` payloads, can hang, can throw). `traceback.ts` is tested on
  stored Python traceback text.
- `narrate` tests mock `fetch` (`vi.fn`): success, 500, timeout (fake timers),
  bad JSON, extra fields, empty strings, huge strings, markdown in strings.
- Route tests inject a fake model client and check validation, prompt
  content, and output limiting. No network, no keys.
- All tests run offline and fast (testing.md).

## Correctness properties

Live in `narration.property.test.ts`, 200+ cases, shrunk counterexamples
saved as fixtures, failures logged in `docs/pbt-findings.md`.

| Id | Property | Requirement |
| --- | --- | --- |
| NP-1 | For all strings, with a mocked worker that returns arbitrary payloads (including garbage), `runCode` resolves with a valid `RunResult`, and `ok` iff no `error`, and `source` echoes the input. | E-1, E-2 |
| NP-2 | For all generated tracebacks and sources, every frame is `main.py` with `1 <= line <= lineCount`. | E-6, E-7 |
| NP-3 | For all `(run, tree)` pairs, with `fetch` mocked as: ok, throws, hangs, non-2xx, garbage, `narrate` resolves. | E-13, E-25 |
| NP-4 | For all failing runs, the four text fields are non-empty and `nodeId` is in the tree. | E-15 |
| NP-5 | For all failing runs and all model answers (random strings, markdown, newlines, long text), the output obeys word limits and speech-ready rules. | E-16, E-17, E-25 |
| NP-6 | For all failing runs with frames, `location` names the innermost frame line, and the node at `nodeId` contains that line unless it is the root fallback. | E-18 |
| NP-7 | For all failing runs, offline output is identical on two calls and has no `{` or `}`. | E-22 |
| NP-8 | For all failing runs and any message text (including text that looks like instructions), the route response has exactly the three string fields or an error status. | E-25, E-29 |
| NP-9 | For all route requests built from arbitrary values, invalid requests get 400 and never reach the model client. | E-27 |
| NP-10 | For all model answers, `location`, `nodeId` never come from the answer. | E-26 |

Unit tests (not properties): each encyclopedia entry rendered for a realistic
message; timeout kills and replaces the worker; `input()` gives `EOFError`;
two runs do not share globals; loading and failed states; API key absent from
the route's response and logs.

## Security notes

- The key stays in server env only (`LLM_API_KEY`); `.env` is gitignored;
  provide `.env.example` with empty names only.
- Code and error text are untrusted data (E-29). The route constrains the
  output shape and length, so a prompt injection can at worst change the
  wording of three short strings, which are sanitised before speech.
- The route logs nothing from the request body.
- The worker has no access to the page DOM; Pyodide's network access is not
  exposed to the user code beyond what Pyodide gives by default (noted as a
  risk: `pyodide.http` could fetch; decision in Q-E5 follow-up).
