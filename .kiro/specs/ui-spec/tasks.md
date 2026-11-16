# UI spec: tasks

Order: slice 1 (U-T1 to U-T5) is the smallest end-to-end demo: type or load
code, run it, see and hear the error, jump to the failing node. It consumes
the other modules' slice 1 and can start with fakes. Each task says what it
needs from other specs.
Tick a task only when its code, tests, `npm run typecheck`, `npm test`, and
`npm run lint:a11y` pass. Commit prefix: `feat(ui):`, `test(ui):`, `fix(ui):`.

Cross-module order for the first demo: P-T1..P-T4, N-T1..N-T4, E-T1..E-T4,
S-T1..S-T4, then U-T1..U-T5.

Needs from the user before starting: Q-U2, Q-U6 (devDependencies), Q-U1.

## Slice 1: smallest end-to-end

- [x] **U-T1 Shell and live regions.** `src/app/App.tsx` and `src/ui/`:
  skip link, header, three regions with headings, footer, the two live regions
  and `announce` helper with the repeat trick, `AppServices` interface and
  `appReducer` skeleton, fake services. Default theme tokens, visible focus.
  Reqs: U-1, U-2, U-3, U-27, U-28.
- [x] **U-T2 Editor and run with a stub.** Labeled textarea, line count,
  `Run (R)` button, `Ctrl+Enter`, `Running` and `Finished` messages and
  output `<pre>`, using a fake `runCode`. `messages.ts` with its property
  test. Reqs: U-8, U-9, U-14, U-15, U-18, U-29.
- [x] **U-T3 Tree from the parser.** Wire real `parse` and
  `StructureTree`; parse on edit with the 300 ms debounce and the
  `Structure updated` message; syntax issue list. Needs P-T4, N-T4.
  Reqs: U-10, U-11.
- [x] **U-T4 Error flow with offline narration.** Wire `narrate`; assertive
  message in the U-16 order; explanation fields; `Error here` via
  `errorNodeId`; `E` and `Jump to error`. Needs E-T4. Reqs: U-16, U-17, U-19.
- [x] **U-T5 Error cue and Stop.** Lazy `AudioContext` in a gesture handler,
  `sonifyError` plays after a failed run, `Escape` / `S` / `Stop` stop sound
  and speech, `Sound stopped` message. Needs S-T4, S-T8 (before S-T8 use the
  fake). Reqs: U-30, U-31, U-16.

Demo checkpoint: keyboard only, type `print(x)`, Ctrl+Enter, hear the cue,
read the explanation, press E in the tree.

## Slice 2: the full flow

- [x] **U-T6 Open file and example.** `Open Python file`, validation and
  messages, `Load an example with a bug` and `example.ts` (user reviews the
  text). Reqs: U-4, U-5, U-6, U-7.
- [x] **U-T7 Structure buttons and focus return.** `Move` and `Structure
  actions` groups with labels, `aria-keyshortcuts`, focus return rules.
  Needs N-T5. Reqs: U-22, U-23.
- [x] **U-T8 Go to line and edit here.** Go-to-line form, `lineStartOffset`
  and its property test, `Enter` on a treeitem. Needs N-T7. Reqs: U-12, U-20,
  U-24.
- [x] **U-T9 Overview, focus, and move sounds.** `P`, `F`, move cue filtered to
  own events, volume scaling, `Last sound` caption. Needs S-T7, S-T9, S-T11,
  N-T6. Reqs: U-25, U-34, Table U-1 rows P and F.
- [x] **U-T10 Hear it again and speech.** `N` and button, speech sequencing
  after the cue, `T` toggle, `M` toggle, audio failure message. Needs N-T10,
  S-T12. Reqs: U-32, U-33, U-35.
- [ ] **U-T11 Real runtime.** Swap the stub for `runCode`, runtime status
  text, `Python is ready`, `Already running`, error boundary. Needs E-T7,
  E-T8. Reqs: U-13, U-14, U-21.

## Slice 3: dialogs, settings, visual design

- [x] **U-T12 Dialog base, Welcome, Legend.** Native `<dialog>` helper
  (focus in, Escape, focus back); Welcome with stored flag; Legend with
  built-in legend tree and Play buttons. Reqs: U-36, U-37, U-38.
- [x] **U-T13 Settings and persistence.** Settings dialog, storage helpers with
  try and catch, property test. `Speech rate` needs `Speaker.setRate` (add
  via navigation-a11y-spec; ask first). Reqs: U-39, U-40.
- [x] **U-T14 Tokens, themes, contrast.** `tokens.ts`, CSS, Default (dark
  purple and orange, ghost mark) and High contrast, contrast property test,
  reduced-motion rules, reflow at 320 px. Reqs: U-41, U-42, U-43, U-44, U-45,
  U-46.
- [ ] **U-T15 Keys section and reducer properties.** `Keyboard shortcuts`
  section with the consistency test; `appReducer` property test; tab-order
  property. Reqs: U-2, U-27, U-50, U-51.

## Slice 4: release

- [x] **U-T16 Build and deploy.** `VITE_NARRATE_URL`, WASM and Pyodide
  assets in the build, README deploy steps for the static site and the route.
  Reqs: U-47.
- [x] **U-T17 End-to-end and axe.** Playwright keyboard-only test of the whole
  flow (needs Q-U6); axe in both themes at 200 percent zoom. Reqs: U-48.
- [x] **U-T18 Docs and release record.** `docs/a11y-checks.md` template with
  what was and was not tested; README with keyboard map, run, test, license;
  list every screen and state. Reqs: U-48, U-49.

## Stretch (not scheduled)

- Other languages, multi-file projects, a richer editor after screen reader
  checks, sharing links, step-through debugging, extras specs (trainer,
  haunted mode).
