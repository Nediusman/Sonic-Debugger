# Navigation and accessibility spec: tasks

Order: slice 1 (N-T1 to N-T4) gives a keyboard-navigable ARIA tree over a
hand-built tree: arrows, announcements, roving tabindex. Slice 1 needs no
parser, audio, or network.
Tick a task only when its code, tests, `npm run typecheck`, `npm test`, and
`npm run lint:a11y` pass. Commit prefix: `feat(navigation):`,
`test(navigation):`.

Blocked until answered: N-T6 final letters (Q-N1), N-T1 (Q-N3).

## Slice 1: smallest end-to-end

- [x] **N-T1 Shared types.** Add `FocusPosition`, `NavAction`, `NavState`,
  `NavResult` to `src/shared/types.ts` (explicitly allowed). Needs Q-N3.
  Reqs: N-1, N-12.
- [x] **N-T2 Position, visibility, next and previous.** `positionOf`,
  `visibleNodeIds`, `createNavState` (root expanded and focused, Q-N5),
  `navigate` for `next`, `previous`, `first`, `last` with boundary messages.
  Tree literals as fixtures. Reqs: N-1, N-2, N-3, N-4, N-15.
- [x] **N-T3 announce.** `announce.ts` over parser `describeNode`. Reqs:
  N-16.
- [ ] **N-T4 (jsdom axe passes; real-browser axe reports label-content-name-mismatch on an expanded treeitem, see docs/a11y-checks.md) StructureTree component (arrows only).** Render ARIA tree
  (N-27 to N-29), roving tabindex, `aria-label` = `announce`, focus
  follows state, one Tab stop, visible focus style, `ArrowDown` and
  `ArrowUp`. axe and `lint:a11y` clean. Export from `index.ts`. Reqs: N-17,
  N-27, N-28, N-29, N-30, N-31, N-33.

Handoff after N-T4: the UI agent can mount the tree.

## Slice 2: full model and keys

- [x] **N-T5 Expand, collapse, parent, first child.** Actions, messages,
  `intentToAction` (ArrowRight and ArrowLeft table). Reqs: N-5, N-6, N-7,
  N-8.
- [x] **N-T6 Key map.** `keymap.ts`, `keyToCommand`, `isStopAudioKey`;
  reserved keys, modifiers, repeat rules, `event.code` only, tree-only
  handling, `preventDefault` rules. Reqs: N-19 to N-26.
- [x] **N-T7 goToLine and goToError.** Actions with messages; ancestors
  expanded. Reqs: N-9, N-10, N-11.
- [x] **N-T8 rebaseState.** Keep state valid after re-parse. Reqs: N-14.
- [x] **N-T9 Error marker in tree.** `Error here` text on the error node.
  Reqs: N-32.

## Slice 3: speech and quality

- [x] **N-T10 Speaker.** `createSpeaker` over `SpeechSynthesisLike`, off by
  default, cancel, unsupported message. Reqs: N-34 to N-39.
- [x] **N-T11 Random trees and key arbitraries.** Generators for `CodeTree`
  literals and `KeyLike`. Reqs: all [PBT].
- [x] **N-T12 Property tests.** NV-1 to NV-11 in
  `navigation.property.test.ts`; regression fixtures; findings logged in
  `docs/pbt-findings.md`. Reqs: all [PBT].
- [ ] **N-T13 (tests written and passing in `tests/tree.a11y.test.tsx`; blocked on the same N-T4 finding) Component a11y tests (`tests/tree.a11y.test.tsx`; jsdom axe skips contrast, which `ui.property.test.ts` UP-4 and the browser axe run cover).** axe on the rendered tree in each theme
  class, ARIA attribute checks, focus indicator CSS contrast check against
  the theme tokens (tokens from ui-spec). Reqs: N-28, N-29, N-31, N-32.
- [x] **N-T14 Docs.** `src/navigation/README.md` with the key map table and
  the manual screen reader checklist (feeds `docs/a11y-checks.md`, N-40).

## Stretch (not scheduled)

- Type-ahead, structural jumps (next function, next loop).
- Braille output; custom key map.
