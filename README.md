# Sonic Debugger

A debugging tool for blind and low-vision developers. It turns Python code into a navigable tree and sound, runs the code, and narrates where and why it failed, using only the keyboard.

Built for Kiroween 2026 (Frankenstein category).

## Status

Built so far: parser, sonification, error narration, keyboard navigation and the single-page UI, each from a spec in `.kiro/specs/`. Not done yet: the four extras (trainer, error encyclopedia, hear the fix, haunted mode), the MCP server, the optional bug trail, and checks with a real screen reader. Python runs in the browser through Pyodide, loaded from a CDN, so the first run needs a network connection.

## Run

    npm install
    npm run dev

## Test

    npm run check

## Keyboard map
| Key (tree focused) | Action |
| --- | --- |
| Down arrow, Up arrow | Next or previous visible item |
| Right arrow | Expand, or go to the first item inside |
| Left arrow | Collapse, or go to the parent |
| Home, End | First or last visible item |
| Enter | Edit this construct in the editor |
| G | Go to line |
| E | Go to the error |
| P | Play the overview sound |
| F | Play the focused construct |
| R | Run the code |
| S, Escape | Stop all sound (Escape works anywhere) |
| T | Turn speech on or off |
| M | Turn reduced sound on or off |
| N | Repeat the last explanation |
| L | Open the sound legend |
| ? (Shift plus Slash) | Show the key list |
| Ctrl plus Enter | Run the code (editor only) |

| Settings, Open Python file, Load an example with a bug, Run (R), Hear it again (N) | Buttons only (Run also has R and Ctrl plus Enter) |

Type-ahead is not supported. Keys that combine Ctrl, Alt or Meta are never bound. Every command is also a labeled button.

See `src/navigation/README.md`. Release checks are recorded in `docs/a11y-checks.md`.

## Documentation

| Document | Contents |
| --- | --- |
| `.kiro/steering/` | Shared rules: context, accessibility, contracts, sonification mapping, testing, workflow |
| `.kiro/specs/` | Requirements, design and tasks for each of the five modules |
| `.kiro/agents/`, `.kiro/hooks/` | The 13 custom agents and the Kiro hooks |
| `src/parser/README.md` | Parser API and loader |
| `src/sonification/README.md`, `src/sonification/LEGEND.md` | Sound mapping API and the sound legend |
| `src/narration/README.md` | Runner, narration and the serverless route |
| `src/navigation/README.md` | Key map, ARIA tree and announcements |
| `docs/a11y-checks.md` | What was checked with axe and Lighthouse, and what was not |
| `docs/screen-reader-test-script.md` | Step-by-step NVDA and VoiceOver checks (not yet run) |
| `docs/pbt-findings.md` | Property-test findings |
| `docs/*-assumptions.md` | Choices made where the specs were silent |

## License

MIT
