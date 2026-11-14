# Parser spec: tasks

Order: slice 1 (T1 to T4) gives a working `parse` for a small program in Node,
so the other modules can start from real trees. Tick a task only when its
code, tests, `npm run typecheck`, `npm test`, and `npm run lint:a11y` pass.
Commit prefix: `feat(parser):`, `test(parser):`.

## Slice 1: smallest end-to-end

- [x] **P-T1 Spike: load WASM in Node.** Write `loader.node.ts` and a test
  that parses `x = 1` with real web-tree-sitter 0.27.2 and the grammar at
  `node_modules/tree-sitter-python/tree-sitter-python.wasm`, and asserts the
  root node type is `module`. Check `Language.abiVersion` is accepted. If the
  grammar does not load, stop and report (Q-P2). Reqs: P-23, P-24.
- [x] **P-T2 Shared types.** Add `NodeKind`, `TreeNode` (with
  `parameterCount?`), `ParseIssue`, `CodeTree` to `src/shared/types.ts`,
  exactly as in design.md. This task is explicitly allowed to touch
  `src/shared/`. Requires Q-P1 answered. Reqs: P-7, P-8, P-16.
- [x] **P-T3 Convert module, functions, classes.** `convert.ts` for
  `module`, `class`, `function`, `method` with names, depth, ranges, ids
  (A-P2), `parameterCount`, then `parse.ts` wiring and `index.ts` export.
  Never throws. Reqs: P-1, P-2, P-7, P-8, P-9, P-12, P-14, P-15, P-16, P-23.
- [x] **P-T4 Pure helpers and describeNode.** `navigate.ts` (`parent`,
  `firstChild`, `nextSibling`, `previousSibling`, `nodeAtLine`) and
  `describe.ts` for the kinds from T3. Fixture trees as literals. Reqs: P-17,
  P-18, P-19, P-20, P-21, P-22.

Handoff after T4: sonification, narration, and navigation agents can start.

## Slice 2: full kind coverage

- [x] **P-T5 Remaining kinds.** loop, conditional (with `elif` and `else`
  children), try, call, assignment, return, import, other. Table P-1 and
  Table P-2 complete. Reqs: P-13, P-15, P-21.
- [x] **P-T6 Syntax issues.** `issues.ts`: ERROR and MISSING nodes become
  plain-language issues; partial tree kept. Reqs: P-4, P-5.
- [x] **P-T7 Line endings and cleanup.** Normalise `\r\n` and `\r`; delete
  WASM tree and parser after conversion. Reqs: P-6, P-11, P-27.
- [x] **P-T8 Load failure path.** Injectable `WasmLoader`, `configureParser`,
  root-only tree with the fixed message, retry on next call. Reqs: P-24,
  P-25.

## Slice 3: browser and quality

- [ ] **P-T9 Browser loader.** `loader.browser.ts` with Vite `?url` imports;
  verify `npm run build` bundles both WASM files and does not include
  `node:fs`. Run a manual smoke test in the dev server. Reqs: P-24.
- [x] **P-T10 Python generator.** `grammar.ts` fast-check arbitraries for
  functions, classes, loops, conditionals, try, nesting, returns, imports,
  calls, assignments, with a model that records expected parameter counts.
  Reqs: P-3, P-16.
- [x] **P-T11 Property tests.** `parser.property.test.ts` for PR-1 to PR-14,
  200+ cases each, shrunk counterexamples saved to
  `src/parser/fixtures/regressions/`, failures logged in
  `docs/pbt-findings.md`. Reqs: all [PBT].
- [x] **P-T12 Performance and determinism check.** Test for the 1,000-line
  budget; ensure `npm run test:determinism` picks up `parser.property.test.ts`
  (file name contains `determinism` or a describe block does; confirm the
  script's filter matches). Reqs: P-10, P-26.
- [x] **P-T13 Docs.** Short `src/parser/README.md` with the public API and
  loader notes; update root README only for run/test commands if changed.

## Stretch (not scheduled)

- Other languages.
- Incremental re-parse.
- `except` and `finally` nodes.
