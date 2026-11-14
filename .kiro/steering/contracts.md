---
inclusion: always
---

# Shared contracts (names are final)

## Parser (src/parser)

- NodeKind: module | class | function | method | loop | conditional | try |
  call | assignment | return | import | other
- TreeNode { id, kind, name?, depth, startLine, endLine, startCol, endCol,
  parentId | null, childIds[] }
- CodeTree { rootId, nodes: Record<id, TreeNode>, issues: ParseIssue[] }
- ParseIssue { line, column, message }
- parse(source): Promise<CodeTree> // never throws; partial tree plus
  issues on bad input
- parent(tree, id), firstChild(tree, id), nextSibling(tree, id),
  previousSibling(tree, id), nodeAtLine(tree, line) // pure
- describeNode(tree, node): string // speech-ready, e.g. "function
  process_items, 3 parameters, 12 lines"

## Sonification (src/sonification)

- SoundEvent { nodeId, startOffsetMs, durationMs, frequencyHz, timbre, gain,
  stereoPan }
- sonifyTree(tree, options?): SoundEvent[] // overview
- sonifyNode(tree, nodeId, options?): SoundEvent[] // focus mode
- sonifyError(tree, line): SoundEvent[] // error cue at the failing node
- describeSoundEvent(event, tree): string
- createPlayer(audioContext): { play(events), pause(), resume(), stop(),
  setSpeed(n), onEvent(callback) }

## Narration (src/narration)

- RunResult { ok, source, stdout, error?: { type, message, frames: { file,
  line, fn }[] } }
- runCode(source): Promise<RunResult>
- NarrationResult { summary, location, cause, suggestedFix, nodeId, offline }
- narrate(run, tree): Promise<NarrationResult> // falls back to the offline
  encyclopedia

## Navigation (src/navigation)

- FocusPosition { nodeId, index, total, level }
- Actions: next, previous, expand, collapse, parentNode, firstChildNode,
  first, last, goToLine, goToError
- announce(position, tree): string // built on describeNode

## Rules

- Modules talk only through these exports. No reaching into another module's
  internals.
- Types live in src/shared/types.ts and change only through the spec.
