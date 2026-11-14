# Parser spec: requirements

Module: `src/parser`. Owner: parser agent. Scope: Python source only.
Input: a source string. Output: a `CodeTree` (see design.md).

Conventions: lines are 1-based and columns are 0-based (assumption A-P1).
`[PBT]` marks a requirement with an invariant that must hold for all inputs
and needs at least one property test citing its id.

## Requirements

### Robustness

- **P-1 [PBT]** When `parse(source)` is called with any string, including
  random bytes, binary-looking text, or a 1 MB string, the parser shall
  resolve with a `CodeTree` and shall never reject or throw.
- **P-2** When `parse("")` is called, the parser shall resolve with a tree
  whose only node is the `module` root and whose `issues` array is empty.
- **P-3 [PBT]** When `parse` is called with valid Python generated from the
  test grammar (functions, classes, loops, conditionals, try, nesting), the
  parser shall return `issues` equal to `[]`.
- **P-4** When the source contains a syntax error, the parser shall return a
  partial tree that still contains every construct that parsed correctly, and
  at least one `ParseIssue`.
- **P-5 [PBT]** When `parse` returns issues, the parser shall give every
  issue a `line` in `[1, lineCount]`, a `column` in `[0, lineLength]`, and a
  non-empty plain-language `message` of at most 120 characters with no
  tree-sitter jargon (no "ERROR node", no "MISSING").
- **P-6 [PBT]** When `parse` is called with a source that uses `\r\n` or `\r`
  line endings, the parser shall return a tree deep-equal to the tree of the
  same source with `\n` line endings.

### Tree invariants

- **P-7 [PBT]** When `parse` returns a tree, the parser shall make
  `nodes[rootId]` a `module` node with `depth` 0 and `parentId` null, and
  shall make every other node reachable from the root through `childIds`
  exactly once (no cycles, no orphans).
- **P-8 [PBT]** When `parse` returns a tree, the parser shall ensure for every
  node: `nodes[id].id === id`; each child has `parentId` equal to the node's
  id; each child has `depth` equal to the node's `depth + 1`.
- **P-9 [PBT]** When `parse` returns a tree, the parser shall ensure for every
  node: `1 <= startLine <= endLine <= lineCount`; the node's range contains
  the range of each child; `childIds` are in source order (start line, then
  start column, non-decreasing).
- **P-10 [PBT]** When `parse` is called twice with the same string, the
  parser shall return deep-equal trees (determinism).
- **P-11 [PBT]** When `parse` returns a tree, the parser shall return plain
  data only: `JSON.parse(JSON.stringify(tree))` is deep-equal to `tree`, and
  no object holds a reference to a WASM tree-sitter object.
- **P-12** When `parse` assigns ids, the parser shall use `"n"` followed by the
  node's pre-order index zero-padded to 5 digits (`n00000` is the root), so
  that sorting ids as strings equals source pre-order (assumption A-P2).

### Kind, name, and parameter mapping

- **P-13** When the parser converts a tree-sitter Python node, the parser
  shall map it to a `NodeKind` according to Table P-1 and shall skip every
  tree-sitter node type not in the table (the skipped node's children are
  attached to the nearest included ancestor).
- **P-14** When a `function_definition` (including `async def`, with or
  without decorators) is a direct child of a class body, the parser shall
  give it kind `method`. Otherwise the parser shall give it kind `function`,
  including a function nested inside a method.
- **P-15** When a node has a name per Table P-1, the parser shall set `name`
  to that text, truncated to 40 characters. When Table P-1 gives no name, the
  parser shall leave `name` undefined.
- **P-16 [PBT]** When a `function` or `method` node is produced, the parser
  shall set `parameterCount` to the number of parameters in its signature
  (each of `self`, `*args`, `**kwargs`, keyword-only and defaulted parameters
  counts as one). Every other node shall leave `parameterCount` undefined.

**Table P-1: tree-sitter type to NodeKind**

| tree-sitter type | NodeKind | name |
| --- | --- | --- |
| `module` | module | none |
| `class_definition` | class | class identifier |
| `function_definition` | function or method (P-14) | function identifier |
| `for_statement`, `while_statement` | loop | none |
| `if_statement` | conditional | `if` |
| `elif_clause` | conditional (child of the `if`) | `elif` |
| `else_clause` of an `if_statement` | conditional (child of the `if`) | `else` |
| `try_statement` | try | none |
| `call` that is the whole expression of an expression statement | call | callee text, e.g. `print`, `obj.method` |
| `assignment`, `augmented_assignment` | assignment | target text if it is a plain identifier, else none |
| `return_statement` | return | none |
| `import_statement`, `import_from_statement` | import | module name, e.g. `os`, `collections` |
| `with_statement`, `match_statement`, `raise_statement`, `assert_statement` | other | the keyword: `with`, `match`, `raise`, `assert` |

(The `else_clause` of a `for`, `while`, or `try` is not a node; its children
attach to the enclosing construct. Open questions Q-P3 and Q-P4 cover this
table.)

### Navigation helpers

- **P-17 [PBT]** When `parent`, `firstChild`, `nextSibling`, or
  `previousSibling` is called with an id that is not in the tree, the parser
  shall return `null` and shall not throw.
- **P-18 [PBT]** When `nextSibling(tree, id)` returns a node, the parser
  shall make `previousSibling(tree, thatId)` return the node `id`, and vice
  versa. `firstChild(tree, id)` shall equal `nodes[childIds[0]]`, and
  `parent(tree, root)` shall be `null`.
- **P-19 [PBT]** When `nodeAtLine(tree, line)` is called with `line` in
  `[1, lineCount]`, the parser shall return the deepest node whose range
  contains `line`; when two siblings both contain it, the earlier sibling.
  The returned node shall contain `line` and none of its children shall.
  When `line` is outside `[1, lineCount]` or not an integer, the parser shall
  return `null`.
- **P-20 [PBT]** When any helper is called, the parser shall not mutate the
  tree (verified by deep-freezing the tree in tests).

### Description

- **P-21** When `describeNode(tree, node)` is called, the parser shall return
  the string defined in Table P-2.
- **P-22 [PBT]** When `describeNode` is called with any node of any tree
  returned by `parse`, the parser shall return a non-empty single-line string
  of at most 200 characters, with no leading or trailing space, containing no
  characters from `` `*#<>{}[]|\ ``, and the same string on every call.

**Table P-2: describeNode output** (`L` = `endLine - startLine + 1`,
pluralised: "1 line", "2 lines")

| kind | output |
| --- | --- |
| module | `module, L lines` |
| class | `class <name>, M methods, L lines` (M = count of direct `method` children) |
| function | `function <name>, P parameters, L lines` |
| method | `method <name>, P parameters, L lines` |
| loop | `loop, L lines` |
| conditional | `if, L lines` / `else if, L lines` (elif) / `else, L lines` |
| try | `try block, L lines` |
| call | `call <name>` (no name: `call`) |
| assignment | `assignment to <name>, line N` (no name: `assignment, line N`) |
| return | `return, line N` |
| import | `import <name>` |
| other | `<name> statement, L lines` |

Example from contracts.md: `function process_items, 3 parameters, 12 lines`.

### Loading (browser and Node)

- **P-23** When `parse` is first called, the parser shall initialise
  web-tree-sitter 0.27.2 and load the Python grammar from
  `node_modules/tree-sitter-python/tree-sitter-python.wasm` exactly once, and
  shall share that initialisation between concurrent calls.
- **P-24** When running in Node (tests), the parser shall read both WASM files
  from disk and pass the bytes to web-tree-sitter. When running in a browser,
  the parser shall load both WASM files by URL (Vite `?url` imports). The
  environment-specific loading shall sit behind a `WasmLoader` option set with
  `configureParser` (see design.md).
- **P-25** If the WASM runtime or the grammar fails to load, then `parse`
  shall resolve with a root-only tree and one issue at line 1, column 0 whose
  message is `Code analysis could not start. You can still edit and run the
  code.`, and shall retry loading on the next call.
- **P-26** When `parse` is called with 1,000 lines of Python in Node after the
  first call, the parser shall resolve within 500 ms (assumption A-P4).
- **P-27** When `parse` has built the `CodeTree`, the parser shall delete the
  tree-sitter tree and parser objects it created so no WASM memory is retained
  between calls.

## User-facing behavior

The parser has no UI of its own. The behaviors it feeds are specified in
navigation-a11y-spec and ui-spec. For each, this is the parser's part:

| Behavior | Shortcut | Announcement | Sound |
| --- | --- | --- | --- |
| Describe the focused node | any move key (see navigation-a11y-spec) | `describeNode` string, Table P-2 | none from the parser (sonification-spec plays it) |
| Report syntax issues after open or run | none (automatic) | "N syntax issues. First: line L, MESSAGE" (built in ui-spec from `ParseIssue`) | none |

## Assumptions

- **A-P1** Lines are 1-based, columns 0-based, matching Python tracebacks.
  contracts.md is silent.
- **A-P2** Node id format `n` + 5-digit pre-order index.
- **A-P3** `parse` normalises `\r\n` and `\r` to `\n` before parsing.
- **A-P4** Performance budget (500 ms for 1,000 lines) is mine, not from the
  steering files.
- **A-P5** Source containing a NUL character is parsed as-is, no rejection.

## Open questions (need an answer from the user)

- **Q-P1 Contract extension.** contracts.md's `TreeNode` has no parameter
  count, but its `describeNode` example says "3 parameters". `describeNode`
  receives only `(tree, node)` and `CodeTree` holds no source. This spec adds
  `parameterCount?: number` to `TreeNode`. Approve or give another way.
- **Q-P2 ABI compatibility.** `tree-sitter-python` is 0.25 and
  `web-tree-sitter` is 0.27.2. Task P-T1 verifies the grammar loads. If it
  does not, the task stops and reports instead of changing versions.
- **Q-P3 Which nodes count.** Table P-1 is my choice: calls only as whole
  expression statements; `other` only for with, match, raise, assert. `pass`,
  `break`, `continue`, `global`, `del`, `lambda`, comprehensions, `except`
  and `finally` clauses are not nodes. Confirm or list changes.
- **Q-P4 elif/else nodes.** contracts.md has no `else` kind, but
  sonification-rules.md gives "rising for if, falling for else". I model
  `elif` and `else` as `conditional` child nodes named `elif` and `else`.
  Confirm.

## Stretch (not scheduled)

- JavaScript, TypeScript, or other languages.
- Nodes for `except` and `finally` clauses, lambdas, comprehensions.
- Incremental re-parse (`tree.edit`) for large files.
- Docstring and comment nodes.
