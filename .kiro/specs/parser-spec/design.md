# Parser spec: design

## Public interfaces

Types live in `src/shared/types.ts` (change only through this spec). Names
come from contracts.md. The one addition is marked.

```ts
export type NodeKind =
  | 'module' | 'class' | 'function' | 'method' | 'loop' | 'conditional'
  | 'try' | 'call' | 'assignment' | 'return' | 'import' | 'other';

export interface TreeNode {
  id: string;
  kind: NodeKind;
  name?: string;
  depth: number;
  startLine: number;   // 1-based
  endLine: number;     // 1-based, inclusive
  startCol: number;    // 0-based
  endCol: number;      // 0-based
  parentId: string | null;
  childIds: string[];
  parameterCount?: number; // ADDITION (Q-P1): function and method only
}

export interface ParseIssue { line: number; column: number; message: string }

export interface CodeTree {
  rootId: string;
  nodes: Record<string, TreeNode>;
  issues: ParseIssue[];
}
```

```ts
// src/parser/index.ts: the only import path other modules may use
export function parse(source: string): Promise<CodeTree>; // never throws
export function parent(tree: CodeTree, id: string): TreeNode | null;
export function firstChild(tree: CodeTree, id: string): TreeNode | null;
export function nextSibling(tree: CodeTree, id: string): TreeNode | null;
export function previousSibling(tree: CodeTree, id: string): TreeNode | null;
export function nodeAtLine(tree: CodeTree, line: number): TreeNode | null;
export function describeNode(tree: CodeTree, node: TreeNode): string;

// Not in contracts.md. Needed because parse(source) has no loader argument.
export interface WasmLoader {
  /** Bytes or URL of web-tree-sitter.wasm. */
  runtime(): Promise<Uint8Array | string>;
  /** Bytes or URL of tree-sitter-python.wasm. */
  grammar(): Promise<Uint8Array | string>;
}
export function configureParser(loader: WasmLoader): void;
```

`configureParser` is the only addition to the function list. It is optional:
if never called, `parse` uses the default loader for the detected environment
(Node when `process.versions.node` exists and `window` is undefined, otherwise
browser).

## Data flow

```
source string
   |  normalise line endings (A-P3)
   v
web-tree-sitter Parser (Language.load of tree-sitter-python.wasm)
   |  syntax tree (WASM objects)
   v
convert(): walk once, apply Table P-1, build plain objects, collect ERROR and
MISSING nodes into ParseIssue[]
   |  tree.delete(), parser.delete()   (P-27)
   v
CodeTree  ---> sonification (sonifyTree/sonifyNode/sonifyError)
          ---> narration (nodeAtLine for the failing frame)
          ---> navigation (parent, firstChild, nextSibling, ..., describeNode)
          ---> ui (renders the tree, issues)
```

Consumers receive only `CodeTree` and the pure helpers. Nobody imports
web-tree-sitter except `src/parser/loader.*.ts`.

## Loading (browser and Node)

web-tree-sitter 0.27.2 API used: `Parser.init(moduleOptions)`,
`Language.load(input: string | URL | Uint8Array)`, `new Parser()`,
`parser.setLanguage`, `parser.parse`.

| Environment | Runtime wasm | Grammar wasm |
| --- | --- | --- |
| Node (Vitest) | `fs.readFile` of `node_modules/web-tree-sitter/web-tree-sitter.wasm`, passed as `wasmBinary` in `Parser.init` | `fs.readFile` of `node_modules/tree-sitter-python/tree-sitter-python.wasm`, bytes passed to `Language.load` |
| Browser (Vite) | `import url from 'web-tree-sitter/web-tree-sitter.wasm?url'`, returned through `locateFile` in `Parser.init` | `import url from 'tree-sitter-python/tree-sitter-python.wasm?url'`, string passed to `Language.load` |

The `tree-sitter-wasms` package is not used (it does not work).
Files: `loader.node.ts`, `loader.browser.ts`, `loader.ts` (selects, holds the
`configureParser` override). The Node loader must not be bundled into the
browser build (dynamic `import('node:fs/promises')` behind the environment
check). Task P-T1 proves the Node path; task P-T9 proves the browser build.

Initialisation is a single memoised promise. On failure it is cleared so the
next `parse` retries (P-25).

## Module layout

```
src/parser/
  index.ts            public exports only
  parse.ts            parse(): orchestration, never throws
  convert.ts          tree-sitter node -> TreeNode (Table P-1)
  issues.ts           ERROR/MISSING -> ParseIssue with plain messages
  navigate.ts         pure helpers
  describe.ts         describeNode (Table P-2)
  loader.ts, loader.node.ts, loader.browser.ts
  fixtures/           hand-written trees and Python samples
  grammar.ts          test-only Python generator (fast-check arbitraries)
```

## Independent testability

- `navigate.ts` and `describe.ts` take a `CodeTree` literal, so they test
  without WASM.
- `convert.ts` tests run in Node with the real grammar (it is local, fast,
  and offline). No mocks needed.
- Failure path (P-25) tests inject a `WasmLoader` that rejects.

## Correctness properties

Each property cites its requirement and lives in `parser.property.test.ts`
(200+ runs; shrunk counterexamples saved as fixtures; failures logged in
`docs/pbt-findings.md`).

| Id | Property | Requirement |
| --- | --- | --- |
| PR-1 | For all strings, `parse` resolves and the result has a root. | P-1 |
| PR-2 | For all programs from the grammar, `issues.length === 0`. | P-3 |
| PR-3 | For all strings, every issue has line in range, column in range, a non-empty message with no banned jargon. | P-5 |
| PR-4 | For all programs, CRLF and CR variants parse to the LF tree. | P-6 |
| PR-5 | For all strings, the tree is a rooted tree: one root, no cycles, no orphans, ids unique. | P-7 |
| PR-6 | For all strings, ids match keys, parentId and depth are consistent. | P-8 |
| PR-7 | For all strings, line ranges are valid, nested, and children are in source order. | P-9 |
| PR-8 | For all strings, `parse(s)` deep-equals `parse(s)`. | P-10 |
| PR-9 | For all strings, the tree survives a JSON round trip unchanged. | P-11 |
| PR-10 | For all programs, only `function` and `method` have `parameterCount`, and it equals the count in the generator's model. | P-16 |
| PR-11 | For all trees and all ids (valid or random), the four relation helpers never throw, and sibling relations are inverse. | P-17, P-18 |
| PR-12 | For all trees and all lines, `nodeAtLine` returns the deepest containing node or `null` out of range. | P-19 |
| PR-13 | For all frozen trees, no helper mutates. | P-20 |
| PR-14 | For all nodes of all parsed trees, `describeNode` meets P-22. | P-22 |

Edge cases to cover with unit tests (not properties): empty file; file of
only comments; only a decorator with no function; deeply nested (200 levels)
input; very long single line; non-ASCII identifiers; tabs; NUL character;
`else` attached to `for`; `async def` in a class; nested class.

## Mocks

None for the parser itself. Other modules' tests use the fixtures exported
from `src/parser/fixtures` only through the public `CodeTree` shape.
