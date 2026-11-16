# Navigation module

Pure focus model over a `CodeTree`, the keyboard map, `announce`, the ARIA tree component and the optional speech wrapper. Import only from `src/navigation/index.ts`.

## Exports

`announce`, `createNavState`, `rebaseState`, `navigate`, `positionOf`, `visibleNodeIds`, `keyToCommand`, `isStopAudioKey`, `intentToAction`, `KEY_LIST`, `createSpeaker`, `SPEECH_UNSUPPORTED_MESSAGE`, `StructureTree`, `focusTreeItem`, `getTreeItemProps`, and the types `FocusPosition`, `NavAction`, `NavState`, `NavResult`, `KeyCommand`, `KeyLike`, `NavIntent`, `AppCommand`, `Speaker`, `SpeechSynthesisLike`.

## Key map

| Key (tree focused) | Action |
| --- | --- |
| Down arrow, Up arrow | Next or previous visible item |
| Right arrow | Expand, or go to the first item inside |
| Left arrow | Collapse, or go to the parent |
| Home, End | First or last visible item |
| Enter | Edit this construct in the editor |
| G | Go to line |
| E | Go to the error |
| P | Play the overview sound |
| F | Play the focused construct |
| R | Run the code |
| S, Escape | Stop all sound (Escape works anywhere) |
| T | Turn speech on or off |
| M | Turn reduced sound on or off |
| N | Repeat the last explanation |
| L | Open the sound legend |
| ? (Shift plus Slash) | Show the key list |
| Ctrl plus Enter | Run the code (editor only) |

Type-ahead is not supported. Keys that combine Ctrl, Alt or Meta are never bound. Every command is also a labeled button.

`event.code` is used everywhere. `?` is `Shift+Slash`. Held keys repeat only Up and Down. Mapped keys call `preventDefault`; Escape never does.

## Test

    npx vitest run src/navigation

Tests: unit tests, fast-check properties NV-1 to NV-11 (250 cases each), server-rendered markup checks and a CSS check for the focus ring. axe needs a DOM and is not installed; see `docs/screen-reader-test-script.md` for the manual checks.

## Manual screen reader checklist

See `docs/screen-reader-test-script.md`. Decisions the spec left open: `docs/navigation-assumptions.md`.
