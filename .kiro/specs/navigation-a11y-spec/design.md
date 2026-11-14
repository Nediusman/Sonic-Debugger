# Navigation and accessibility spec: design

## Public interfaces

Types go in `src/shared/types.ts`. Names from contracts.md: `FocusPosition`,
the action names, `announce`. Everything else is an addition (Q-N3).

```ts
export interface FocusPosition {
  nodeId: string;
  index: number;   // 1-based among siblings
  total: number;   // sibling count
  level: number;   // depth + 1
}

// The ten actions from contracts.md. Only goToLine takes an argument.
export type NavAction =
  | { type: 'next' } | { type: 'previous' }
  | { type: 'expand' } | { type: 'collapse' }
  | { type: 'parentNode' } | { type: 'firstChildNode' }
  | { type: 'first' } | { type: 'last' }
  | { type: 'goToLine'; line: number }
  | { type: 'goToError' };

// ADDITION: serialisable plain data, no Set, so tests can compare with toEqual.
export interface NavState {
  focusId: string;
  expandedIds: string[];        // sorted ascending; only nodes with children
  errorNodeId: string | null;   // set by the UI from NarrationResult.nodeId
}

// ADDITION
export interface NavResult {
  state: NavState;
  position: FocusPosition;
  message: string;   // always set; text for the live region or speech
  moved: boolean;    // true if focusId changed
}
```

```ts
// src/navigation/index.ts: the only import path other modules may use
export function announce(position: FocusPosition, tree: CodeTree): string;

// ADDITIONS
export function createNavState(tree: CodeTree, errorNodeId?: string | null): NavState;
export function rebaseState(oldTree: CodeTree, state: NavState, newTree: CodeTree): NavState;
export function positionOf(tree: CodeTree, nodeId: string): FocusPosition;
export function visibleNodeIds(tree: CodeTree, state: NavState): string[];
export function navigate(tree: CodeTree, state: NavState, action: NavAction): NavResult;

// Keyboard
export type NavIntent =
  | 'next' | 'previous' | 'first' | 'last'
  | 'expandOrDescend'   // ArrowRight
  | 'collapseOrAscend'; // ArrowLeft
export type AppCommand =
  | 'promptGoToLine' | 'goToError' | 'playOverview' | 'playFocus'
  | 'stopAudio' | 'run' | 'toggleSpeech' | 'toggleReducedSound'
  | 'repeatNarration' | 'editHere' | 'showLegend' | 'showKeys';
export type KeyCommand =
  | { kind: 'nav'; intent: NavIntent }
  | { kind: 'app'; command: AppCommand };
export interface KeyLike {
  code: string; ctrlKey: boolean; altKey: boolean; metaKey: boolean;
  shiftKey: boolean; repeat: boolean;
}
export function keyToCommand(event: KeyLike): KeyCommand | null;      // pure
export function intentToAction(tree: CodeTree, state: NavState, intent: NavIntent): NavAction;
export function isStopAudioKey(event: KeyLike): boolean;              // Escape

// Speech
export interface Speaker {
  readonly supported: boolean;
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  setRate(rate: number): void;   // clamped to 0.5..2, default 1
  speak(text: string): void;
  cancel(): void;
}
export function createSpeaker(synth?: SpeechSynthesisLike): Speaker;

// React component (ARIA tree pattern)
export interface StructureTreeProps {
  tree: CodeTree;
  state: NavState;
  onKeyCommand(command: KeyCommand, event: React.KeyboardEvent): void;
  onItemFocus(nodeId: string): void;  // DOM focus reached an item (click or Tab in)
}
export function StructureTree(props: StructureTreeProps): JSX.Element;
```

`goToError` appears both as a `NavAction` (the model) and as an
`AppCommand` (key `E`). The UI maps key `E` to `navigate(tree, state,
{type: 'goToError'})`, so `AppCommand` `goToError` is a thin alias; the
implementation reads `errorNodeId` from state. `promptGoToLine` opens the
UI's labeled "Go to line" input; on submit the UI calls `navigate` with
`{type: 'goToLine', line}`.

## Data flow

```
CodeTree (parser) ─┐
NarrationResult.nodeId ─> NavState.errorNodeId
                   v
 createNavState / rebaseState  ──> NavState
                   │
 key event on tree ──> keyToCommand ──> KeyCommand
        nav:  intentToAction(tree,state,intent) ──> NavAction
                   │
                   v
              navigate(tree, state, action) ──> NavResult { state, position, message, moved }
                   │
 UI: moved ?  DOM focus follows state.focusId; treeitem name = announce(position, tree)
              + focus cue: sonifyNode(tree, focusId)  -> player
     !moved?  message -> polite live region
     speech on? speaker.speak(message or announce text)
        app:  UI handler runs the command (run, overview, stop, ...)
```

`announce` is built on the parser's `describeNode`:

```
announce(p, tree) = `${describeNode(tree, tree.nodes[p.nodeId])}, item ${p.index} of ${p.total}, level ${p.level}`
```

Example: `function process_items, 3 parameters, 12 lines, item 2 of 5, level 2`.

## Behavior of ArrowRight and ArrowLeft (`intentToAction`)

| Intent | Node state | Action |
| --- | --- | --- |
| `expandOrDescend` | has children, collapsed | `expand` |
| | has children, expanded | `firstChildNode` |
| | leaf | `firstChildNode` (message `No items inside`) |
| `collapseOrAscend` | expanded | `collapse` |
| | collapsed or leaf, not root | `parentNode` |
| | root | `parentNode` (message `Top of structure`) |

## ARIA rendering

```html
<ul role="tree" aria-label="Code structure">
  <li role="treeitem" id="ti-n00000" aria-level="1" aria-setsize="1"
      aria-posinset="1" aria-expanded="true" tabindex="0"
      aria-label="module, 40 lines, item 1 of 1, level 1">
    <span>module, 40 lines</span>              <!-- visible text -->
    <ul role="group">
      <li role="treeitem" ... aria-expanded="false" tabindex="-1" aria-label="..."></li>
```

Rules: native `ul`/`li`; ARIA only for tree roles; roving tabindex; the
visible text equals `describeNode` (so voice-control users can say it); the
error node adds the text `Error here`. Rendering reads `NavState` only; it
never computes focus itself. The tree's CSS lives with ui-spec themes.

## Module layout

```
src/navigation/
  index.ts
  model/        position.ts, visible.ts, navigate.ts, state.ts (create, rebase)
  keys/         keymap.ts (table), keyToCommand.ts, intent.ts
  announce.ts
  speech/       speaker.ts
  tree/         StructureTree.tsx, StructureTree.css
  fixtures/     tree literals; synthetic KeyLike builders
```

The model and keys layers are pure TypeScript, no React, no DOM. They import
the parser only through `src/parser/index.ts`.

## Independent testability

- Model tests use hand-built `CodeTree` literals and a generator for random
  trees (no parser, no WASM).
- Key tests use plain `KeyLike` objects, so no DOM.
- Tree component tests use Testing Library with jsdom plus axe (`jest-axe`
  equivalent for Vitest). `npm run lint:a11y` runs the eslint jsx-a11y rules.
- Speech tests use a `FakeSpeechSynthesis` with `speak`, `cancel`, `speaking`.

## Correctness properties

Live in `navigation.property.test.ts`, 200+ cases, shrunk counterexamples
saved as fixtures, failures logged in `docs/pbt-findings.md`.

| Id | Property | Requirement |
| --- | --- | --- |
| NV-1 | For all trees and nodes, `positionOf` satisfies `1 <= index <= total`, `level = depth + 1`. | N-1 |
| NV-2 | For all trees and states, `visibleNodeIds` is pre-order and omits descendants of collapsed nodes; `first` and `last` match its ends. | N-2 |
| NV-3 | For all trees and states, walking `next` from `first` visits each visible node exactly once, then reports `End of structure` without moving. Mirror for `previous`. | N-3, N-4 |
| NV-4 | For all trees and goal lines in range, `goToLine` focuses a visible node containing the line. | N-9 |
| NV-5 | For all trees and random action sequences (200 actions), the state stays valid (focus visible, expanded set holds only nodes with children), no input mutated, nothing throws. | N-12 |
| NV-6 | For all trees, states, actions: `navigate` twice gives equal results. | N-13 |
| NV-7 | For all pairs of trees and states, `rebaseState` returns a valid state. | N-14 |
| NV-8 | For all trees and positions, `announce` starts with `describeNode`, ends with the position text, is single-line and free of banned characters. | N-16 |
| NV-9 | For all `KeyLike` with any modifier, or with a reserved code, `keyToCommand` returns `null`; for all codes outside the table, `null`. | N-19, N-20 |
| NV-10 | For all trees and states rendered, ARIA attributes equal the model; exactly one `tabindex="0"`; collapsed children are absent. | N-28, N-29 |
| NV-11 | For all random operation sequences on a fake synthesizer, the speaker never throws, never speaks while disabled, and queues at most one utterance. | N-39 |

Unit tests: every message string in N-3 to N-11; each key in the map;
repeat handling; Escape handling and `preventDefault` rules; the static scan
for `event.key`; axe on the rendered tree.

## Accessibility notes for the tree

- A tree is one Tab stop. Screen readers announce the treeitem name on focus,
  so no live region write for moves (N-17).
- `aria-expanded` is present only on items with children.
- Focus return: after a toolbar button action, the UI calls
  `focusTreeItem(focusId)` (ui-spec U-23).
