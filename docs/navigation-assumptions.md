# Navigation assumptions

Decisions taken while building `src/navigation` from the user's instruction to build now. Each stands until a person changes it.

| Id | Decision |
| --- | --- |
| Q-N1 | Letters as in the spec: P overview, R run, E error, L legend, G go to line, S stop, F play focused construct, T speech, M reduced sound, N repeat explanation, Enter edit here. Not checked against NVDA, JAWS or VoiceOver quick-nav keys. |
| Q-N2 | No sound for boundaries, expand, collapse or failed actions. The message text covers them. |
| Q-N3 | Contract additions approved by the user's go-ahead: `NavState`, `NavResult`, `NavAction`, `positionOf`, `createNavState`, `rebaseState`, `keyToCommand`, `createSpeaker`, `StructureTree`. Types are in `src/shared/types.ts`. |
| Q-N4 | No automatic sound on moves. The UI plays the focus cue on request (F) or as ui-spec U-25 decides. The navigation module only reports `moved`. |
| Q-N5 | Root expanded and focused, all other nodes collapsed. |
| Q-N6 | `announce` has no expanded or collapsed text. State comes from `aria-expanded` and the expand and collapse messages. The example in the agent brief ("... Collapsed.") was not followed because the spec and contracts.md fix the format. |
| Q-U1 | `?` is `Shift+Slash`. It is the only shifted key that maps. |

## Choices the spec did not settle

- **Escape.** It is not in `KEY_MAP`. `isStopAudioKey` identifies it so the UI can listen on the whole page and never call `preventDefault`. Closing dialogs and returning focus to the tree is ui-spec work (U-24, U-37).
- **Error node description.** The treeitem name stays exactly `announce(...)` (N-17). The `Error here` text is linked with `aria-describedby`, so a screen reader can read it as a description. Support for descriptions on treeitems varies and needs a manual check.
- **Speech settings.** The spec does not ask for `localStorage`, so the speaker keeps rate in memory only. Persistence is a UI settings task (ui-spec).
- **`goToLine` on a tree whose root starts after line 1.** Lines outside `[1, root.endLine]`, or lines no node contains, get the "outside the file" message.
- **Stale ids after a re-parse.** `rebaseState` keeps `errorNodeId` only when the same id still exists in the new tree. The UI sets it again from the next narration.
- **Held keys.** A held mapped key calls `preventDefault` but only Up and Down repeat the command.
- **Go-to-line input, live regions, dialogs, focus return.** These belong to ui-spec. This module exports `focusTreeItem(root, nodeId)` for focus return.
