# Parser

Turns Python source into a `CodeTree` (types in `src/shared/types.ts`).

## Public API (`src/parser/index.ts`)

- `parse(source): Promise<CodeTree>`: never rejects. Syntax errors give a partial tree plus `issues`.
- `parent`, `firstChild`, `nextSibling`, `previousSibling`, `nodeAtLine`: pure, return `null` when nothing matches.
- `describeNode(tree, node)`: speech-ready text (Table P-2 in the spec).
- `configureParser(loader)` and type `WasmLoader`: override how the two WASM files load.

Lines are 1-based, columns 0-based. Ids are `n` plus the 5-digit pre-order index.

## Loading

- Node (tests): `loader.node.ts` reads `web-tree-sitter/web-tree-sitter.wasm` and `tree-sitter-python/tree-sitter-python.wasm` from `node_modules`.
- Browser: `loader.browser.ts` uses Vite `?url` imports. Vite emits both files as assets.
- If loading fails, `parse` returns a root-only tree with one issue and retries on the next call.

## Tests

`npm test` runs unit and property tests. `npm run test:determinism` runs `parser.determinism.test.ts`.
