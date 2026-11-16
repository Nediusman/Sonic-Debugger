# Accessibility checks

Record of what was tested and what was not (accessibility.md rule 11, ui-spec U-48).

## Release record

| Field | Value |
| --- | --- |
| Date | 2026-11-16 |
| Version | 0.1.0 (no release tag yet) |
| Browser used | Chromium 156 on Linux, headless, via Playwright |

| Check | Tested | Result |
| --- | --- | --- |
| NVDA (Windows) with Firefox and Chrome | No | Needs a human |
| VoiceOver (Mac) with Safari | No | Needs a human |
| Orca or other Linux screen reader | No | Needs a human |
| axe, Default theme, 640 px wide viewport (200 percent zoom of a 1280 px window), states: initial, after error, legend, settings | Yes | 0 other violations. One known serious finding, `label-content-name-mismatch`, on the root tree item once the example is loaded and the root is expanded (defect in `src/navigation` StructureTree, reported, excluded from the assertion). `npm run test:e2e`, `tests/e2e/axe.spec.ts` |
| axe, High contrast theme, same states | Yes | Same as Default |
| axe in jsdom on the structure tree, both theme attributes | Yes | 0 violations (`tests/tree.a11y.test.tsx`). jsdom has no layout, so contrast is not checked there |
| Contrast of every token pair, both themes | Yes | All pass 4.5:1 text and 3:1 controls and focus ring (`ui.property.test.ts`, UP-4) |
| Reflow at 320 px, no horizontal scroll | Yes, automated | Passes in both themes (`axe.spec.ts`). Not checked by eye |
| Real browser 200 percent zoom (Ctrl plus plus) | No | Needs a human |
| Lighthouse accessibility, default theme, production build | Yes | 100 (Lighthouse 13.6.0, welcome dialog open) |
| Keyboard-only flow (Playwright) | Yes | Passes with real Pyodide: example, overview, tree, run, error, E, Enter (`keyboard-flow.spec.ts`) |
| Real audio output: pitch, timbre, error cue by ear | No | Headless Chromium has no audio device. Needs a human |
| Text-to-speech voice and rate | No | Not exercised in headless Chromium. Needs a human |
| Live region behavior: polite versus assertive in a screen reader | No | Needs a human |
| Native file picker | No | Playwright does not drive the OS dialog in these tests. Needs a human |
| High contrast theme by eye, Halloween palette by eye | No | Screenshot reviewed only for the default theme |

## Manual checklist for the screen reader pass

1. Load the page. The welcome dialog title is read and focus is inside it. Escape closes it.
2. Tab order: skip link, Settings, Open Python file, Load example, code, Run, tree, Move buttons, Structure actions, output, Hear it again, footer link.
3. Tree: arrows read each item as "kind name, N lines, item X of Y, level L". Letter keys work in focus mode (NVDA: switch to focus mode if needed).
4. Load the example, press R. The error is read once (assertive) with "Press E to go to the failing construct". Press E and check "Error here".
5. Enter on a tree item puts the caret on that line and says "Editing line N".
6. Settings, Sound legend: focus in, Escape out, focus back on the opener.
7. Escape and S silence sound and speech together.
