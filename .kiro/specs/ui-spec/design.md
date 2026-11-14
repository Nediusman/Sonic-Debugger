# UI spec: design

## Public interfaces

The UI exports nothing for other modules. It consumes only the contracts.md
exports plus the approved additions listed in the other specs. Its own
interfaces exist to keep it testable: it receives all module functions through
one `AppServices` object, so tests inject fakes.

```ts
import type {
  CodeTree, RunResult, NarrationResult, SoundEvent,
} from '../shared/types';

export interface AppServices {
  parse(source: string): Promise<CodeTree>;
  runCode(source: string): Promise<RunResult>;
  narrate(run: RunResult, tree: CodeTree): Promise<NarrationResult>;
  onRuntimeStatus(cb: (s: 'idle' | 'loading' | 'ready' | 'failed') => void): () => void;
  preloadRuntime(): void;
  sonifyTree(tree: CodeTree, o?: { reducedSound?: boolean }): SoundEvent[];
  sonifyNode(tree: CodeTree, id: string, o?: { reducedSound?: boolean }): SoundEvent[];
  sonifyError(tree: CodeTree, line: number, o?: { reducedSound?: boolean }): SoundEvent[];
  describeSoundEvent(e: SoundEvent, tree: CodeTree): string;
  describeOverview(tree: CodeTree, o?: { reducedSound?: boolean }): string;
  createPlayer(ctx: AudioContext): Player;       // Player from sonification-spec
  createAudioContext(): AudioContext;            // wraps `new AudioContext()`; called only in a gesture
  createSpeaker(): Speaker;                      // Speaker from navigation-a11y-spec
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
}
```

`src/app/services.ts` builds the real object from the module `index.ts`
exports. Tests build it from fakes. The UI never imports a module's internals.

```ts
// src/ui/state.ts
export type ThemeName = 'default' | 'high-contrast';
export interface Settings {
  volume: number;          // 0..1
  reducedSound: boolean;
  speech: boolean;
  speechRate: number;      // 0.5..2
  theme: ThemeName;
  reduceMotion: boolean;
  dontShowWelcome: boolean;
}
export type RunStatus = 'idle' | 'running' | 'finished' | 'failed';
export interface AppState {
  source: string;
  fileName: string | null;
  tree: CodeTree;                 // always set; root-only tree for ""
  nav: NavState;                  // navigation-a11y-spec
  run: {
    status: RunStatus;
    result: RunResult | null;
    narration: NarrationResult | null;
    errorLine: number | null;
  };
  runtime: 'idle' | 'loading' | 'ready' | 'failed';
  goToLineOpen: boolean;
  audioPlaying: boolean;
  lastSound: string;              // describeSoundEvent text
  settings: Settings;
}
export type AppAction =
  | { type: 'sourceEdited'; source: string }
  | { type: 'fileOpened'; name: string; source: string }
  | { type: 'treeParsed'; tree: CodeTree }
  | { type: 'runStarted' }
  | { type: 'runFinished'; result: RunResult; narration: NarrationResult }
  | { type: 'navigated'; nav: NavState }
  | { type: 'runtimeChanged'; runtime: AppState['runtime'] }
  | { type: 'settingsChanged'; settings: Partial<Settings> }
  | { type: 'audio'; playing: boolean; lastSound?: string };
export function appReducer(state: AppState, action: AppAction): AppState; // pure
export function lineStartOffset(source: string, line: number): number;   // pure
```

```ts
// src/ui/messages.ts: pure message builders (U-29)
export function openedMessage(name: string, lines: number, constructs: number): string;
export function exampleMessage(lines: number): string;
export function structureMessage(constructs: number, issues: ParseIssue[]): string;
export function finishedMessage(stdout: string): string;
export function errorMessage(n: NarrationResult): string;       // U-16 text
export function explanationMessage(n: NarrationResult): string; // for "Hear it again"
export function lineProblemMessage(input: string, lineCount: number): string;
export function toggleMessage(name: 'Speech' | 'Reduced sound', on: boolean): string;
export function openFailedMessage(name: string, reason: string): string;
```

## Data flow (the one flow)

```
Open file / Load example / typing in textarea
      │ source
      v
 parse (parser) ──> CodeTree ──> createNavState / rebaseState ──> NavState
      │                                   │
      │                          StructureTree (navigation) ── keys ──> keyToCommand
      │                                   │                              │
      │                                   │            nav intents ──> navigate ──> NavResult
      │                                   │            app commands ──> handlers (below)
      v                                   v
 P: sonifyTree ──> volume scale ──> player.play ──> onEvent ──> "Last sound" caption
 move: sonifyNode(tree,id).filter(own) ──> player.play
 R / Ctrl+Enter:
      status "Running" (polite)
      runCode(source) ──> RunResult ──> narrate(run, tree) ──> NarrationResult
         ok:   polite "Finished. No errors. N lines of output."
         fail: assertive errorMessage(narration)
               errorNodeId = narration.nodeId ──> tree shows "Error here"
               line = innermost frame line ──> sonifyError(tree, line) ──> player.play
               speech on? speaker.speak(explanation) after cue "end"
 E: navigate({type:'goToError'}) ──> focus failing node (+ cue)
 Enter on treeitem: textarea.focus(); setSelectionRange(lineStartOffset(...))
 edit the code ──> loop back to parse
```

Handlers live in `src/ui/commands.ts`: one function per `AppCommand` that
takes `(services, getState, dispatch)`. They are tested without React.

## Layout and DOM order

```
<a class="skip" href="#structure-heading">Skip to structure tree</a>
<header> <h1>Sonic Debugger</h1> <button>Settings</button> </header>
<main>
  <section aria-labelledby="editor-h"> <h2 id="editor-h">Editor</h2>
     [Open Python file] [Load an example with a bug]
     <label for="code">Python code</label> <textarea id="code">
     <p>N lines</p>  <ul aria-label="Syntax issues">
     [Run (R)]   <p>Status: …</p>  (the polite live region)
  <section aria-labelledby="structure-h"> <h2 id="structure-h" tabindex="-1">Structure</h2>
     <StructureTree/>
     <div role="group" aria-label="Move"> …8 buttons… </div>
     <div role="group" aria-label="Structure actions"> Play overview, Play this construct, Jump to error, Go to line, Stop, Legend, Keys </div>
     <form hidden> <label>Line number</label> <input> [Go] </form>
     <p>Last sound: …</p>
  <section aria-labelledby="output-h"> <h2 id="output-h">Output</h2>
     <p>Python: ready</p> <pre tabindex="0" aria-label="Program output">
     <dl> Summary, Where, Why, Suggested fix, offline explanation label </dl>
     [Hear it again (N)]
     <div role="alert"></div>   (the assertive live region)
</main>
<footer> <a href="#keys">Keyboard shortcuts</a> </footer>
<section id="keys"> <h2 tabindex="-1">Keyboard shortcuts</h2> … text list … </section>
<dialog> Settings | Sound legend | Welcome </dialog>
```

The Settings button sits in the header but its dialog is modal, so reading
order stays logical. On reflow below 640 px everything stacks in the same
order (U-45).

## Visual tokens (src/ui/tokens.ts and tokens.css)

One file defines color, spacing, type for the two themes. The contrast test
imports the same token object the CSS is generated from, so they cannot drift.
Pairs declared in the file: text/background, muted text/background, link or
control text/control background, control border/background, focus
ring/background, focus ring/control, error text/background, `Error here` badge
text/badge. Exact colors are chosen in task U-T11 and must pass U-42; they are
not in this spec because the steering files give none.

## Example program (U-7)

The example is a short Python file in `src/ui/example.ts` as a string. It must:
parse with no issues; define at least one function containing a loop and a
conditional (so the overview has varied timbres); and raise an `IndexError`
inside the function at a line deeper than depth 1 when run, so the narration
location names a function (`line L, in NAME`). Between 12 and 25 lines. Exact
text is written in task U-T6 and reviewed by the user.

## Independent testability

- `appReducer`, `lineStartOffset`, `messages.ts`, `tokens` and storage helpers
  are pure and tested without React.
- Components are tested with React Testing Library under jsdom with
  `AppServices` fakes: fake parser returns tree literals, fake `runCode`
  returns canned results, fake player records `play`/`stop`.
- `FakeAudioContext` counts constructions (U-30). `FakeStorage` throws on
  demand (U-40). Fake timers drive the 300 ms debounce (U-10).
- axe runs on the rendered page in both themes. Playwright (tests/e2e) runs
  the keyboard-only flow against the dev server with the real parser and a
  stubbed run result; a second run uses real Pyodide when available.
- Testing steering applies: LLM, Pyodide and Web Audio are mocked in unit
  tests; `npm run typecheck`, `npm test`, `npm run lint:a11y` before done.

## Correctness properties

Live in `ui.property.test.ts`, 200+ cases, shrunk counterexamples saved as
fixtures, failures logged in `docs/pbt-findings.md`.

| Id | Property | Requirement |
| --- | --- | --- |
| UP-1 | For all sources and lines in range, `lineStartOffset` returns the start of that line (previous char is `\n` or offset is 0, and the newline count before it is `line - 1`). | U-12 |
| UP-2 | For all valid message inputs, builders return single-line, non-empty, banned-character-free strings of at most 400 characters, equal on repeat. | U-29 |
| UP-3 | For all settings values, `load(save(s)) = s`; for all throwing, garbage, or missing storage, load returns defaults without throwing. | U-40 |
| UP-4 | For every declared token pair in every theme, contrast meets the threshold for its kind. (Enumerated, drawn through fast-check so a later added pair is covered automatically.) | U-42 |
| UP-5 | For all action sequences, `appReducer` keeps the state valid (focus visible, legal run transitions, error node exists, editor text correct, no mutation). | U-51 |
| UP-6 | For all rendered states (random `AppState`), the tab order equals DOM order, no `tabindex > 0`, exactly one polite and one assertive region. | U-2, U-27 |

Unit tests (not properties): every row of Table U-1; the U-16 order of
operations (assert call order with fakes: alert text, errorNodeId, cue, focus
unchanged); debounce; focus return after Move buttons; dialogs (focus in,
Escape, focus back); `AudioContext` not constructed before the first gesture;
Escape stops audio and speech together; `Ctrl+Enter` only in the editor;
letter keys ignored in the editor; both themes produce the same announcements;
`prefers-reduced-motion` stylesheet scan; welcome dialog respects the stored
flag; offline label.

## Manual checks that need a human (recorded in docs/a11y-checks.md)

NVDA with Firefox and Chrome, VoiceOver with Safari: tree reading, letter keys
in focus mode, live region announcements (polite vs assertive), dialogs, file
picker, and the error flow. Real audio output (pitch, timbre, tritone) by ear.
200 percent zoom. Lighthouse accessibility 95 or higher.
