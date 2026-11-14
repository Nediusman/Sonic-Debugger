# UI spec: requirements

Modules: `src/ui/` and `src/app/` (the shell that wires the other four modules
through their contracts.md exports). Owner: ui agent. Python only.
Single page, one flow that must be excellent:
open a Python file -> hear its structure -> run it -> hear exactly where and
why it failed -> fix it, without a mouse and without looking at the screen.

Sources: steering files, the other four specs, and `.kiro/agents/ui.md` (which
lists the dialogs, settings, example, and flow-control buttons; I treat its
list as the intended UI scope, see A-U1).
`[PBT]` marks invariants for property tests. Keys use `event.code`.

## Requirements

### Page structure

- **U-1** When the page loads, the system shall render, in DOM order: a skip
  link `Skip to structure tree`; a `<header>` with the `<h1>` `Sonic Debugger`
  and a `Settings` button; a `<main>` with three `<section>` regions, each with
  an `<h2>` and an accessible name: `Editor`, `Structure`, `Output`; and a
  `<footer>` with a link `Keyboard shortcuts`. The document shall have
  `lang="en"` and `<title>Sonic Debugger</title>`.
- **U-2 [PBT]** When the page is rendered in any state, the Tab order of
  focusable elements shall equal DOM order (no `tabindex` above 0, no CSS
  `order` reordering) and shall be: skip link, Settings, Open Python file,
  Load example with a bug, code textarea, Run, the structure tree (one
  stop), Move buttons, Structure action buttons, output text, Hear it again,
  footer link.
- **U-3** When any control receives focus, the system shall show a visible
  focus indicator (N-31).

### Opening code

- **U-4** When the user activates `Open Python file` (button; no shortcut,
  because Ctrl+O belongs to the browser), the system shall open the native file
  picker, accepting `.py` and `text/x-python`.
- **U-5** When a file is chosen, the system shall read it as UTF-8, put it in
  the editor, parse it, reset the run result, focus the structure tree's root
  item, and announce (polite) `Opened NAME, N lines. Structure ready: M
  constructs. Press P to hear the overview.` No sound plays.
- **U-6** If the file is not UTF-8 text, is larger than 1 MB (**PENDING
  Q-U8**), or cannot be read, then the system shall keep the editor unchanged
  and announce `Could not open NAME: REASON` with a plain-words reason.
- **U-7** When the user activates `Load an example with a bug`, the system
  shall put the bundled example (design.md, "Example program") in the editor,
  parse it, reset the run result, and announce `Example loaded: N lines. Press
  Run to try it.` No sound plays.

### Editor

- **U-8** The editor shall be a native `<textarea>` with a visible `<label>`
  `Python code`, a monospaced font, `spellcheck="false"`,
  `autocomplete="off"`, `autocapitalize="off"`, no auto-closing of brackets,
  no auto-indent, and Tab shall move focus out (no keyboard trap). A visible
  text under it shall show `N lines`.
- **U-9** When the user presses `Ctrl+Enter` in the editor, the system shall
  start a run (U-14) and call `preventDefault`. No other shortcut is bound in
  the editor.
- **U-10** When the user stops typing for 300 ms, the system shall re-parse the
  source, update the tree and navigation state (`rebaseState`), and announce
  (polite) once `Structure updated, N constructs`, and when there are issues
  `, K syntax issues. First: line L, MESSAGE`. It shall not announce while
  the user is still typing: 50 edits within 300 ms produce one re-parse and
  one announcement.
- **U-11** When the parse has issues, the system shall list them under the
  editor as text `Line L, column C: MESSAGE` in a list labeled `Syntax
  issues`, and the tree shall stay navigable.
- **U-12 [PBT]** When `lineStartOffset(source, line)` is called for `line` in
  `[1, lineCount]`, the system shall return an offset `o` such that `o` is 0
  or `source[o - 1]` is `\n`, and `source.slice(0, o)` contains exactly `line -
  1` newlines. (Used by U-20; `\r\n` counts as one break.)

### Running and errors

- **U-13** When the Python runtime is loading, the system shall show the text
  `Python: loading` in the Output region, and announce (polite) `Python is
  ready` once when it becomes ready. If loading fails, it shall show `Python:
  unavailable` and announce it (polite).
- **U-14** When the user starts a run (button `Run (R)`, key `R` in the tree,
  or `Ctrl+Enter` in the editor), the system shall parse the current source,
  set the status text to `Running` (visible), announce (polite) `Running`
  (or `Loading Python, please wait` if not ready), call `runCode`, then
  `narrate`. If a run is in progress, the system shall announce `Already
  running` and start nothing.
- **U-15** When a run finishes with `ok: true`, the system shall show the
  output, set the visible status `Finished, no errors`, announce (polite)
  `Finished. No errors. N lines of output.` (`No output.` when `stdout` is
  empty), and play no sound.
- **U-16** When a run finishes with `ok: false`, the system shall, in this
  order: (1) set the visible status to `Error`; (2) put the narration text
  `<summary> <location>. <cause> <suggestedFix> Press E to go to the failing
  construct.` into the assertive live region exactly once; (3) fill the
  explanation fields; (4) set `NavState.errorNodeId` to
  `NarrationResult.nodeId` so the tree shows `Error here`; (5) play
  `sonifyError(tree, line)` where `line` is the innermost frame's line, or the
  root node's `startLine` when there are no frames; (6) leave keyboard focus
  where it was.
- **U-17** When the explanation is shown, the system shall present labeled
  text fields `Summary`, `Where`, `Why`, and `Suggested fix`, and shall show
  the words `offline explanation` when `offline` is true. Before any run it
  shall show `No explanation yet. Run the code.`
- **U-18** When the Output region shows `stdout`, the system shall render it as
  text in a `<pre>` with `tabindex="0"` and an accessible name `Program
  output`, and shall not put it in a live region.
- **U-19** When the user presses `E` in the tree, or activates `Jump to error
  (E)`, the system shall call `navigate(..., {type: 'goToError'})`, move
  focus to the failing node, play its focus cue, and announce its `announce`
  text through the item's name. With no error it shall announce `No error to
  go to. Run the code first.`
- **U-20** When the user presses `Enter` on a treeitem, the system shall focus
  the editor and place the caret at `lineStartOffset(source, node.startLine)`,
  scroll it into view, and announce (polite) `Editing line N`. The caret and
  selection stay valid for any source.
- **U-21** If a command or module call throws, then the system shall announce
  (assertive) `Something went wrong with this action. Your code is unchanged.`
  and keep running, and the editor text shall never be lost.

### Navigation wiring and buttons

- **U-22** The Structure region shall contain, after the tree, a group `Move`
  with buttons `Next`, `Previous`, `Expand`, `Collapse`, `Parent`, `First
  child`, `First`, `Last`; and a group `Structure actions` with the buttons
  listed in Table U-1. Every button shall be a native `<button>` with a
  visible text label that equals its accessible name, and
  `aria-keyshortcuts` where it has a key.
- **U-23** When a button in `Move` or `Structure actions` (except `Stop`, `Go to
  line`, `Legend`, `Keys`) finishes its action, the system shall return DOM
  focus to the focused treeitem. Buttons `Open Python file`, `Run`, `Stop`,
  `Settings`, and `Hear it again` shall keep focus. (This is "U-13" cited by
  navigation-a11y-spec's design; the id there is read as U-23.)
- **U-24** When the user presses `G` in the tree, or activates `Go to line
  (G)`, the system shall show a form with a visible label `Line number`, a
  text input (`inputmode="numeric"`), and a `Go` button; move focus to the
  input; and announce `Go to line, enter a number`. On Enter or `Go` the
  system shall call `navigate` with `goToLine`, hide the form, and return
  focus to the treeitem. On `Escape` it shall hide the form and return focus
  to the treeitem.
- **U-25** When a move changes the focus, the system shall stop any playing
  sound and play only the focused node's own events
  (`sonifyNode(...).filter(e => e.nodeId === focusId)`), scaled by the volume
  setting. When the action does not move (boundary, expand, collapse), no sound
  plays and the message goes to the polite live region.

**Table U-1: buttons and keys** (key works only with the tree focused, unless
noted)

| Button label | Key (`event.code`) | Announcement | Sound |
| --- | --- | --- | --- |
| Settings | none | dialog title `Settings` | none |
| Open Python file | none | U-5 | none |
| Load an example with a bug | none | U-7 | none |
| Run (R) | `KeyR`; `Ctrl+Enter` in the editor | `Running`, then U-15 or U-16 | none, then error cue on failure |
| Play overview (P) | `KeyP` | `Overview: N constructs, about S seconds` (or the limited sentence) | `sonifyTree` |
| Play this construct (F) | `KeyF` | `describeNode` text | `sonifyNode` |
| Jump to error (E) | `KeyE` | U-19 | focus cue |
| Go to line (G) | `KeyG` | U-24 | focus cue on move |
| Stop (S) | `KeyS`; `Escape` anywhere | `Sound stopped` only if audio was playing | silence |
| Legend (L) | `KeyL` | dialog title `Sound legend` | the row's sound, on request |
| Keys (?) | `Shift+Slash` (Q-U1) | focus moves to the `Keyboard shortcuts` heading | none |
| Hear it again (N) | `KeyN` | the explanation again (U-26) | error cue again |
| Speech: off/on (T) | `KeyT` | `Speech on` / `Speech off` | none |
| Reduced sound: off/on (M) | `KeyM` | `Reduced sound on` / `Reduced sound off` | none |
| Next, Previous, Expand, Collapse, Parent, First child, First, Last | arrows, Home, End (navigation-a11y-spec) | per navigation-a11y-spec | focus cue on move |

### Live regions and messages

- **U-27** The page shall contain, from load, exactly one polite live region
  (`role="status"`, `aria-atomic="true"`) and exactly one assertive live
  region (`role="alert"`), both initially empty. The polite region is visible
  as the `Status` line. The assertive region is used only for run errors,
  timeouts, and U-21.
- **U-28** When the same message is announced twice in a row, the system shall
  still announce it twice (clear the region, then set it on the next frame).
- **U-29 [PBT]** When any message builder in `src/ui/messages.ts` (opened,
  structure updated, issues, finished, error, overview, limited overview,
  settings toggles, line errors) is called with any valid input, it shall
  return a non-empty single-line string with no characters from `` `*#<>{}[]|\ ``,
  at most 400 characters, identical for identical input, and independent of the
  theme.

### Audio and speech

- **U-30** When the page loads, the system shall not create an `AudioContext`.
  The system shall create it, once, inside the first user-gesture handler that
  needs sound (click or keydown), and shall reuse it.
- **U-31** When `Escape` (anywhere), `S` (tree), or `Stop` is used, the system
  shall call `player.stop()` and `speaker.cancel()` in the same event handler,
  and announce `Sound stopped` if audio or speech was active.
- **U-32** When the user activates `Hear it again` or presses `N`, the system
  shall play the error cue again, put the explanation text in the polite
  region, and speak it if speech is on. With no run result it shall announce
  `No explanation yet. Run the code.`
- **U-33** When speech is on and a run fails, the system shall start speaking
  the explanation after the error cue ends (`onEvent` `end`), or immediately
  if audio could not play. When speech is off the app shall speak nothing.
- **U-34** While a sound plays, the system shall show the current event's
  `describeSoundEvent` text in a visible `Last sound` line (not a live
  region).
- **U-35** If audio cannot start (context blocked or closed), then the system
  shall announce `Audio could not start. Use the text descriptions instead.`
  once and continue to work with text.

### Dialogs and settings

- **U-36** When a dialog opens (Settings, Sound legend, Welcome), the system
  shall use a native `<dialog>` opened with `showModal()`, move focus to its
  heading or first control, close on `Escape`, and return focus to the element
  that opened it. Keys behind it are inert.
- **U-37** When the page loads and no `dontShowWelcome` flag is stored, the
  system shall open the Welcome dialog: what the tool does, the six keys that
  matter (`R`, `P`, `E`, `S`, `G`, `L`), and how to open the legend. It shall
  have a `Don't show again` checkbox and a `Close` button.
- **U-38** When the Sound legend opens, the system shall list one row per
  sound-producing kind (module, class, function, method, loop, conditional,
  try, call, assignment, return, import) with the kind name, the
  `describeSoundEvent` text, and a `Play` button that plays that kind's
  sound from a built-in legend tree.
- **U-39** When Settings opens, the system shall offer: `Volume` (range 0 to
  1, default 1; applied by multiplying event gains, so the 0.4 maximum is never
  exceeded), `Reduced sound` (checkbox), `Speech` (checkbox, default off),
  `Speech rate` (0.5 to 2, default 1), `Theme` (`Default` or `High contrast`,
  native select), `Reduce motion` (checkbox, on by default when
  `prefers-reduced-motion: reduce`).
- **U-40 [PBT]** When settings are saved or loaded, the system shall use
  `localStorage` inside try and catch; for any storage that throws, returns
  garbage, or is missing, the system shall fall back to defaults without
  throwing, and for any valid settings value `load(save(s))` equals `s`.

### Visual design

- **U-41** The system shall define all colors, spacing, and type in one tokens
  file with two themes: `Default` (dark purple and orange palette, a small
  ghost mark as decoration) and `High contrast` (overrides the Default
  completely).
- **U-42 [PBT]** When any theme is active, the system shall give every
  declared text and background token pair a contrast ratio of at least 4.5 to 1
  (3 to 1 for large text, borders of controls, and focus rings against both
  adjacent colors).
- **U-43** The Halloween styling shall be decoration only: the ghost mark and
  palette are CSS or `aria-hidden` elements; the DOM text, the announcements,
  and the tab order shall be identical in both themes; there shall be no
  animation.
- **U-44** When `prefers-reduced-motion: reduce` or the `Reduce motion`
  setting is on, the system shall have no transitions or animations (static
  test: no `animation` or `transition` property outside a media query that
  turns it off).
- **U-45** When the viewport is 320 CSS pixels wide (200 percent zoom of a 640
  pixel window), the page shall have no horizontal scrolling and no clipped
  controls (manual check recorded; automated check on the CSS `min-width`).
- **U-46** When the system shows any state (empty, loading, running, error,
  finished, offline), it shall show it as text, never as an icon, color, or
  spinner alone. Error shows the word `Error`.

### Build, checks, and docs

- **U-47** When `npm run build` runs, the system shall produce static files
  including both parser WASM files and the Pyodide files; the serverless route
  deploys separately and the UI reads its URL from `VITE_NARRATE_URL`
  (default `/api/narrate`).
- **U-48** When the system is released, `docs/a11y-checks.md` shall record
  date, version, and for each of NVDA, VoiceOver, axe (default and High
  contrast themes, 200 percent zoom), and Lighthouse: tested or not, result.
  A keyboard-only Playwright test shall complete the whole flow.
- **U-49** When a user reads `README.md`, it shall show: what the tool is, how
  to run, how to test, the keyboard map (copied from Table U-1 and the
  navigation key map), how to deploy, and the license (MIT).
- **U-50** The `Keyboard shortcuts` section shall list every key from Table
  U-1 and the navigation key map as text; a test shall assert that each listed
  `code` maps to a command through `keyToCommand`.

### State model

- **U-51 [PBT]** When any sequence of app actions (open, edit, parse, run
  start, run finish ok, run finish error, navigate, settings change) is applied
  to the app reducer from the initial state, the state shall stay valid:
  `nav.focusId` is in the visible list of `tree`; `run.status` only moves along
  `idle -> running -> finished | failed -> running`; `errorNodeId` is null or a
  node of the current tree; the editor text equals the last edit or opened
  file; and no input state is mutated.

## User-facing behavior summary

Table U-1 gives, for each behavior, the shortcut, announcement, and sound.
Behaviors with no key (open file, load example, settings, welcome) are
reachable by Tab, and have no sound.

## Assumptions

- **A-U1** `.kiro/agents/ui.md` is the scope for UI features, because the user
  wrote it; I did not add features beyond it except what the other specs
  require (Move buttons, `T`, `M`, `N`, `F` keys and buttons).
- **A-U2** Re-parse after 300 ms idle is from ui.md; it replaces my earlier
  idea of parsing on blur.
- **A-U3** `Hear it again` plays the cue and re-announces the explanation
  (ui.md); the same as key `N` in the other specs.
- **A-U4** `Keys` focuses a visible `Keyboard shortcuts` section instead of a
  third dialog.
- **A-U5** Volume multiplies `SoundEvent.gain` in the UI before calling the
  player. The mapping layer is unchanged and stays deterministic.
- **A-U6** The bundled legend tree is a `CodeTree` literal in `src/ui`, one
  node per kind at depth 1.

## Open questions (need an answer from the user)

- **Q-U1** `?` needs Shift on most layouts, but navigation-a11y-spec disables
  all Shift combinations. I allow exactly `Shift+Slash` (updated in that
  spec). The `Keys` button is the layout-independent route.
- **Q-U2** ui.md lists dialogs, settings, and an example that
  project-context.md does not. I included them. Confirm.
- **Q-U3** Persist `Speech` across visits? accessibility.md says off by
  default. I persist the user's explicit choice and default to off.
- **Q-U4** Success has no sound; steering defines only the error cue.
- **Q-U5** Narration route is deployed separately (ui.md), so the
  narration client must take its URL from `VITE_NARRATE_URL` and the route
  must allow CORS from the app origin. Narration spec updated to say so.
- **Q-U6** Playwright, `@axe-core/playwright`, `jest-axe` or equivalent, and
  `@testing-library/react` with jsdom are not in `package.json`. Approve
  adding them as devDependencies.
- **Q-U7** The `Reduce motion` setting has nothing to reduce, because the app
  has no animation. Keep the checkbox (ui.md) or drop it?
- **Q-U8** File size limit 1 MB is mine.
- **Q-U9** The welcome dialog opens on first load without a user gesture. Is
  that acceptable? (It plays no audio.)

## Stretch (not scheduled)

- Other languages; multi-file projects; a heavier code editor (needs
  screen-reader checks first); sharing a link to a program; trainer and
  haunted-mode extras (`extras-*` specs, not part of this spec); a step-through
  debugger; mobile or touch layout beyond reflow.
