---
inclusion: manual
---

# Testing rules

- Vitest for unit and component tests. fast-check for property-based tests.
  axe for accessibility checks.
- Property tests live next to the code as <module>.property.test.ts and run
  at least 200 cases. Keep failing seeds and save every shrunk counterexample
  as a regression fixture.
- Every requirement tagged [PBT] has at least one property test that cites
  the requirement number.
- Generate realistic Python from a small grammar (functions, loops,
  conditionals, nesting) in addition to random strings.
- Mock the LLM, Pyodide, and Web Audio. Tests are fast and offline.
- Every property failure is logged in docs/pbt-findings.md: the property, the
  minimal counterexample, the root cause, and whether a unit test would have
  caught it.
- Before declaring any task done, run: npm run typecheck, npm test, npm run
  lint:a11y.
