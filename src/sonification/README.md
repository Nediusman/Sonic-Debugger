# Sonification module

Turns a `CodeTree` into `SoundEvent[]` (pure, deterministic) and plays them with Web Audio. Import only from `src/sonification/index.ts`.

## Mapping (from `.kiro/steering/sonification-rules.md`)

| Kind | Waveform | Character |
| --- | --- | --- |
| module | sine | soft pad, 80 ms attack |
| class | triangle | 60 ms attack, long release |
| function | square, low-pass 1500 Hz | firm, 10 ms attack |
| method | square, low-pass 800 Hz | darker than function |
| loop | sawtooth, low-pass 2000 Hz | 3 pulses, 110 ms apart, then the body once |
| conditional | triangle | fifth apart, rising for if/elif, falling for else |
| try | sine, 5 Hz vibrato | wavering |
| call | triangle | pluck, 40 ms decay |
| assignment | sine | 30 ms tick |
| return | sine | falling two notes |
| import | sine plus octave | 120 ms chime |
| other | sine | 20 ms tick (assumption Q-S1) |

Pitch: C major pentatonic from 130.81 Hz by depth, capped at depth 14. Pan by sibling position. Gain 0.25, maximum 0.4. Error cue: 311.13 Hz sine plus 440 Hz sawtooth, 600 ms, 4 Hz tremolo, gain 0.4. Open-question decisions are in `docs/sonification-assumptions.md`. The listener-facing legend is `LEGEND.md`.

## API

- `sonifyTree(tree, options?)`, `sonifyNode(tree, nodeId, options?)`, `sonifyError(tree, line, options?)`: `SoundEvent[]`. `options = { reducedSound?: boolean }`.
- `describeSoundEvent(event, tree)`, `describeOverview(tree, options?)`: text for the live region.
- `createPlayer(audioContext)`: `{ play, pause, resume, stop, setSpeed, onEvent }`. `onEvent(cb)` calls `cb(event, "start" | "end")`. Call `play` inside a user gesture.
- `defaultProfile`: the tunable numbers (`mapping/profile.ts`).

## Tests

`npm test` (unit and property tests, mock Web Audio in `fixtures/mockAudio.ts`), `npm run test:determinism`, `npm run typecheck`, `npm run lint:a11y`.
