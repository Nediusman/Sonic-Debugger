# Navigation and accessibility spec: requirements

Module: `src/navigation`. Owner: navigation agent.
Provides: the focus and expansion model over a `CodeTree` (pure), `announce`,
the key map, the ARIA tree component, and the optional text-to-speech
wrapper. The page-level a11y (live regions, themes, layout) is in ui-spec.

`[PBT]` marks invariants for property tests. Keys use `event.code`.
"Tree has focus" means DOM focus is on a `treeitem` inside the structure tree.

## Requirements

### Focus model (pure)

- **N-1 [PBT]** When `positionOf(tree, nodeId)` is called for a node in the
  tree, the system shall return `FocusPosition` with `index` = the node's
  1-based place among its parent's children, `total` = the parent's child
  count, `level` = `depth + 1`; for the root, `index` 1, `total` 1, `level` 1.
  Always `1 <= index <= total`.
- **N-2 [PBT]** When the visible order is computed, the system shall list the
  nodes in pre-order, skipping the descendants of every collapsed node.
  `first` is the root; `last` is the last item of that list.
- **N-3 [PBT]** When `next` is invoked and the focus is not the last visible
  node, the system shall move the focus to the following visible node with
  `moved: true`. When it is the last, the system shall keep the focus, return
  `moved: false`, and the message `End of structure`.
- **N-4 [PBT]** When `previous` is invoked, the system shall do the mirror of
  N-3, with the message `Start of structure` at the root. Applying `next` then
  `previous` from any non-last visible node shall return to the same node.
- **N-5** When `expand` is invoked on a collapsed node with children, the
  system shall add it to the expanded set, keep the focus, return `moved:
  false`, and the message `Expanded, N items` (N = child count, `1 item`
  singular). On an expanded node it shall return `Already expanded`. On a node
  without children it shall return `No items inside`.
- **N-6** When `collapse` is invoked on an expanded node, the system shall
  remove it from the expanded set, keep the focus, and return `Collapsed`. On
  a collapsed node or a leaf it shall return `Already collapsed`.
- **N-7** When `parentNode` is invoked, the system shall move the focus to the
  parent (`moved: true`). At the root it shall keep the focus and return `Top
  of structure`.
- **N-8** When `firstChildNode` is invoked on an expanded node with children,
  the system shall move the focus to its first child. On a collapsed node with
  children it shall expand it and move to the first child. On a leaf it shall
  return `No items inside`.
- **N-9 [PBT]** When `goToLine` is invoked with an integer line in
  `[1, lineCount]`, the system shall focus `nodeAtLine(tree, line)`, expand all
  of its ancestors, and announce the node. The focused node's range shall
  contain `line`, and it shall be visible.
- **N-10** When `goToLine` is invoked with an integer outside the range, the
  system shall keep the state and return `Line N is outside the file, which
  has M lines`. When the value is not an integer it shall return `Enter a
  whole line number`.
- **N-11** When `goToError` is invoked and `errorNodeId` is set, the system
  shall focus that node, expand its ancestors, and announce it. When
  `errorNodeId` is `null` it shall return `No error to go to. Run the code
  first.` and keep the state.
- **N-12 [PBT]** When any sequence of actions is applied to any tree, the
  system shall never throw, shall keep `focusId` in the visible list, shall
  keep the expanded set to nodes that have children, and shall not mutate the
  input state or tree.
- **N-13 [PBT]** When `navigate` is called twice with equal arguments, the
  system shall return deep-equal results (pure, deterministic).
- **N-14 [PBT]** When the tree is replaced by a new parse, `rebaseState` shall
  return a valid state: focus on `nodeAtLine(newTree, oldFocusStartLine)` (or
  the root), expanded set restricted to ids that exist with children, and
  ancestors of the focus expanded.
- **N-15** When a new tree is first shown, `createNavState` shall expand only
  the root and focus the root (**PENDING Q-N5**).

### Announcements

- **N-16 [PBT]** When `announce(position, tree)` is called, the system shall
  return `<describeNode text>, item <index> of <total>, level <level>`, using
  the parser's `describeNode` text for the node, as one single-line string,
  deterministic, with no characters from `` `*#<>{}[]|\ ``.
- **N-17** When a move changes the focus, the system shall make the new
  node's accessible name (`aria-label`) the `announce` string, so a screen
  reader reads it on focus. The system shall not also write it to the live
  region.
- **N-18** When an action does not move the focus (expand, collapse, boundary
  messages, invalid line), the system shall return its message so the UI can
  write it to the polite live region.

### Key map

- **N-19 [PBT]** When `keyToCommand(event)` is called for any event with
  `ctrlKey`, `altKey`, `metaKey` or `shiftKey` set (the one exception is `Slash` with only `shiftKey`, which maps to show keys), or with `code` in
  `F6`, `Insert`, `CapsLock`, `AltLeft`, `AltRight`, `ControlLeft`,
  `ControlRight`, `MetaLeft`, `MetaRight`, the system shall return `null`.
- **N-20 [PBT]** When `keyToCommand` is called for any code not in the map
  below, the system shall return `null`. It shall be a pure function of
  `code` and the four modifier flags.
- **N-21** When a key from the map below is pressed while the tree has focus,
  the system shall run the mapped command and call `preventDefault` on that
  event. For any other key the system shall not call `preventDefault`.
- **N-22** When a mapped key is pressed anywhere except the tree (editor,
  inputs, buttons), the system shall not run the command.
- **N-23** When a key event has `repeat: true`, the system shall run
  movement commands (`ArrowDown`, `ArrowUp`) and ignore all other commands.
- **N-24 [PBT]** When a key map entry is used, the system shall have used
  `event.code` and not `event.key` (static test: no `.key` read in
  `src/navigation`).
- **N-25** When `Escape` is pressed anywhere on the page, the system shall
  call the stop-audio handler without calling `preventDefault`, so other
  Escape behavior (closing the go-to-line input) still works.
- **N-26** Every command in the key map shall also be reachable as a labeled
  native button (the buttons live in ui-spec).

**Key map (tree focused):**

| `event.code` | Command | Announcement | Sound |
| --- | --- | --- | --- |
| `ArrowDown` | `next` | `announce(...)` via focus name | focus cue: the node's own events |
| `ArrowUp` | `previous` | same | same |
| `ArrowRight` | `expand` on a collapsed node with children, else `firstChildNode` | `Expanded, N items`, or announce of the child | none for expand; focus cue on move |
| `ArrowLeft` | `collapse` on an expanded node, else `parentNode` | `Collapsed`, or announce of the parent | none for collapse; focus cue on move |
| `Home` | `first` | announce | focus cue |
| `End` | `last` | announce | focus cue |
| `KeyG` | open "Go to line" input, then `goToLine` | `Go to line, enter a number`, then announce | focus cue on move |
| `KeyE` | `goToError` | announce of the failing node, or the N-11 message | focus cue on move |
| `KeyP` | play overview | sonification spec status text | `sonifyTree` |
| `KeyL` | open the sound legend | dialog title `Sound legend` | none |
| `Shift+Slash` (`?`) | show the keyboard shortcuts list | focus moves to the `Keyboard shortcuts` heading | none |
| `KeyF` | play focused construct | `describeNode` text | `sonifyNode` |
| `KeyS` | stop audio | `Sound stopped` if audio was playing | none |
| `KeyR` | run code | `Running` | none |
| `KeyT` | toggle speech | `Speech on` / `Speech off` | none |
| `KeyM` | toggle reduced sound | `Reduced sound on` / `off` | none |
| `KeyN` | repeat the last explanation | the explanation text | none |
| `Enter` | edit this construct in the editor | `Editing line N` | none |
| `Escape` (anywhere) | stop audio | `Sound stopped` if audio was playing | none |

Never bound: F6, Alt plus anything, Ctrl plus Alt plus anything, Insert,
CapsLock, any Ctrl or Meta combination (Ctrl+Enter runs code in the editor
only; ui-spec).

Boundary and failed-action sounds: none (Q-N2). Text covers every state.

### ARIA tree

- **N-27** When the structure tree renders, the system shall use `<ul
  role="tree" aria-label="Code structure">`, `<li role="treeitem">` items,
  and `<ul role="group">` for the children of an expanded item. Collapsed
  children shall not be in the DOM.
- **N-28 [PBT]** When any tree and state render, every `treeitem` shall have
  `aria-level` = level, `aria-setsize` = total, `aria-posinset` = index, as in
  N-1. Items with children shall have `aria-expanded` `true` or `false`
  matching the state; leaves shall have no `aria-expanded`.
- **N-29 [PBT]** When any tree and state render, exactly one `treeitem` shall
  have `tabindex="0"` (the focused one) and all others `tabindex="-1"`.
- **N-30** When `state.focusId` changes, the system shall move DOM focus to
  that item (`element.focus()`), only if the tree already contained focus or
  the change came from a command run in the tree.
- **N-31** When a treeitem is focused, the system shall show a visible focus
  indicator with at least 3:1 contrast against its background and a 2 px
  minimum thickness, not relying on color alone (outline plus offset).
- **N-32** When the tree renders, the system shall not use color alone to
  show kind, depth, error or focus: each row shows text (`describeNode`),
  and the error node shows the text `Error here`.
- **N-33** When the tree renders, `Tab` shall move focus out of the tree to
  the next control (the tree is one tab stop).

### Text to speech

- **N-34** When the page loads, text-to-speech shall be off.
- **N-35** When speech is on and `speak(text)` is called, the system shall
  cancel any current utterance and speak the text with the default voice at
  the speaker's rate (default 1, set with `setRate` in `[0.5, 2]`) and default
  volume, language `en`.
- **N-36** When speech is off, `speak` shall do nothing.
- **N-37** When `stopAll` is invoked (Escape, `S`), the system shall also
  cancel speech.
- **N-38** If `speechSynthesis` is not available, then the system shall report
  `Speech is not supported in this browser`, keep speech off, and not throw.
- **N-39 [PBT]** When any sequence of `setEnabled`, `speak`, `cancel` calls is
  made on a mock synthesizer, the system shall never throw, shall never call
  `speak` on it while disabled, and shall have at most one queued utterance.

### Release checks

- **N-40** When a release is cut, the team shall record in
  `docs/a11y-checks.md` which checks were run (NVDA with Firefox or Chrome,
  VoiceOver with Safari, axe) and which were not, with date and version
  (ui-spec task owns the file).

## Assumptions

- **A-N1** `index` in `FocusPosition` is 1-based among siblings, `total` the
  sibling count, `level` is `depth + 1` (so they equal `aria-posinset`,
  `aria-setsize`, `aria-level`). contracts.md gives no formulas.
- **A-N2** Single-letter commands also work with CapsLock on or Shift not
  held; Shift disables them (N-19) so Shift+letter keeps its screen reader or
  browser meaning.
- **A-N3** Screen readers in browse mode may capture letters; `role="tree"`
  switches NVDA and JAWS to focus mode, VoiceOver passes keys through. Checked
  manually (N-40).
- **A-N4** Selection (`aria-selected`) is not used.
- **A-N5** `Enter` on a treeitem is mapped by navigation but implemented by
  the UI (focus the editor at the construct's start line). It is not in
  contracts.md's Actions list.

## Open questions (need an answer from the user)

- **Q-N1** Confirm the letter map (G, E, P, F, S, R, T, M, N, L), `Shift+Slash` for `?`, and `Enter`; P, R, E, S, L, G and `?` come from `.kiro/agents/ui.md`.
  I chose letters that avoid reserved keys but did not check them against
  NVDA, JAWS, or VoiceOver key commands in quick-nav mode.
- **Q-N2** Boundary, expand, and collapse actions play no sound. The brief
  says every behavior names a sound; steering gives none for these. Confirm
  "none", or supply a sound.
- **Q-N3** Contract additions: `NavState`, `NavResult`, `NavAction` with
  `goToLine` argument, `positionOf`, `createNavState`, `rebaseState`,
  `keyToCommand`, `createSpeaker`, `StructureTree`. contracts.md has only
  `FocusPosition`, the action names, and `announce`. Approve?
- **Q-N4** Should each move play a sound automatically (my proposal, the node's
  own events), or only on request with `F`? Fast arrowing cancels the
  previous sound.
- **Q-N5** Initial state: root expanded and focused (proposal) or all
  expanded? A large file fully expanded is slow to arrow through.
- **Q-N6** `announce` has no expanded state (signature fixed by contracts.md);
  the state comes from `aria-expanded` and the N-5 and N-6 messages. Confirm.

## Stretch (not scheduled)

- Type-ahead (typing a name jumps to it).
- Sibling-only moves, jump to next loop or next function.
- Braille display output, custom speech voices and rates.
- Customizable key map.
- Multi-select, structure search.
