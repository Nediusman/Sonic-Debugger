# Sonic Debugger

A debugging tool for blind and low-vision developers. It turns Python code into a navigable tree and sound, runs the code, and narrates where and why it failed, using only the keyboard.

Built for Kiroween 2026 (Frankenstein category).

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

## License

MIT
# Sonic-Debugger
# Sonic-Debugger
