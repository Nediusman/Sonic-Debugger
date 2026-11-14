# Property-test findings

## Parser (parser.property.test.ts, parser.determinism.test.ts)

Run: 200 cases per property, fast-check 4.10.2.

| Property | Result |
| --- | --- |
| PR-1 to PR-14 | Pass. No counterexample reached the parser code, so `src/parser/fixtures/regressions/` is empty. |

Failures found while writing the tests (test bugs, not parser bugs):

- PR-12 returned an `expect(...)` object from the property callback, which fast-check read as failure. Counterexample: empty source, line 0. Fixed in the test.
- A 1 MB input exceeded vitest's default 5 s timeout when run beside other files. Parsing 1,020,000 characters (170,000 lines) takes about 4.4 s alone, half in the WASM parser. The test now has a 60 s timeout.

Note: PR-8 lives in `parser.determinism.test.ts` so that `npm run test:determinism` (a file-name filter) picks it up.
