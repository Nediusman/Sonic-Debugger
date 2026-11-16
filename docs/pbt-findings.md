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
## Sonification (sonification.property.test.ts)
Run: 200 cases per property, fast-check 4.10.2, trees of 1 to 400 nodes and depth up to 25.
| Property | Result |
| --- | --- |
| SP-1 to SP-17 | Pass. No counterexample, so `src/sonification/fixtures/regressions/` is not needed. |
Design finding made while planning, not by a counterexample: `round2(10000 / units)` can round up and push a full overview 0.8 ms past 10 000 ms, which would break S-12. `noteMs` therefore rounds down (assumption A-S1b). SP-4 guards it.
SP-16 and S-38: the player exposes no state getter, so the end state is checked through behavior only.

## Navigation (src/navigation/navigation.property.test.ts)

Run: 250 cases per property, fast-check 4.10.2, random `CodeTree` literals of 1 to 25 nodes (no parser).

| Property | Result |
| --- | --- |
| NV-1 to NV-11 | Pass. No counterexample reached the navigation code, so there are no regression fixtures. |

Failures found while writing the tests (test bugs, not module bugs):
- NV-7 asserted `expandedIds.includes(parentId ?? "")`, which is false for the root. The test now checks that every ancestor of the focus is expanded. Counterexample: two single-node trees.
- The "keyToCommand is pure" property returned an `expect(...)` result from the callback, which fast-check read as failure. Counterexample: empty `code`. Fixed with a block body.
- Unit test used a focus on a hidden node with the root-only expanded set. `navigate` repaired it to the root, as N-12 requires. The fixture now opens the parent.
## Narration (narration.property.test.ts)
Run: 200 cases per property, fast-check 4.10.2. NP-1 to NP-10 are implemented. Model and Pyodide are mocked.
Failures found while writing the tests:
| Property | Minimal counterexample | Root cause | Unit test would have caught it? |
| --- | --- | --- | --- |
| NP-3 | model route answers status 200 with a valid body | Test bug: the generator allowed 2xx, which is a valid answer, but the test expected offline | Yes |
| NP-7 | failing run with type `""` | Test bug: `JSON.stringify` output always contains braces. Fixed to check the text fields | Yes |
| NP-7 (side effect) | same run | Product wording bug: the generic cause read "Python reported a error" for an empty type. Reworded to "an error named {type}", with "unknown" for an empty type | Yes, with an empty-type case; `encyclopedia.test.ts` now covers it |
No counterexample reached the module logic otherwise, so `src/narration/fixtures/` has no regressions folder.
## UI (ui.property.test.ts)
Run: 200 cases per property (300 for contrast), fast-check 4.10.2. UP-1 to UP-5 are implemented. UP-6 (random rendered states) is covered by one example-based tab order test in `app.test.tsx`, not a property.
| Property | Minimal counterexample | Root cause | Unit test would have caught it? |
| --- | --- | --- | --- |
| UP-5 | `runStarted`, then `fileOpened` | Product bug: opening a file while a run was in progress reset the status to idle, so the run result was then ignored. Fixed: the run state is kept while running | Maybe |
| UP-5 | `runStarted`, `runFinished`, `fileOpened` | Spec gap: U-5 resets the run on open, which moves finished or failed to idle. The property now allows that one transition | No |
| UP-4 | `focusRing` on `accent` | Test pair was wrong: the ring sits 2 px outside the control, so it never touches the accent fill. Pair removed | Yes |
| UP-2 | empty narration fields | Test bug: callback returned an `expect` result. Fixed with a block body | Yes |
