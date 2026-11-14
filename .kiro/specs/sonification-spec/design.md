# Sonification spec: design

## Public interfaces

Types go in `src/shared/types.ts`. Names are from contracts.md; additions are
marked and need approval (Q-S8).

```ts
import type { CodeTree } from './types'; // parser types

// ADDITION (Q-S8, A-S5): contracts.md leaves timbre's type open.
export type Timbre =
  | 'module' | 'class' | 'function' | 'method' | 'loop' | 'conditional'
  | 'try' | 'call' | 'assignment' | 'return' | 'import'
  | 'error-sine' | 'error-saw';

export interface SoundEvent {
  nodeId: string;
  startOffsetMs: number;
  durationMs: number;
  frequencyHz: number;
  timbre: Timbre;
  gain: number;       // 0 < gain <= 0.4
  stereoPan: number;  // -0.8 .. 0.8
}

// ADDITION (Q-S8): contracts.md says "options?" without a type.
export interface SonifyOptions { reducedSound?: boolean }
```

```ts
// src/sonification/index.ts: the only import path other modules may use
export function sonifyTree(tree: CodeTree, options?: SonifyOptions): SoundEvent[];
export function sonifyNode(tree: CodeTree, nodeId: string, options?: SonifyOptions): SoundEvent[];
export function sonifyError(tree: CodeTree, line: number, options?: SonifyOptions): SoundEvent[];
export function describeSoundEvent(event: SoundEvent, tree: CodeTree): string;
export function describeOverview(tree: CodeTree, options?: SonifyOptions): string; // ADDITION

export type PlayerState = 'idle' | 'playing' | 'paused' | 'stopped';
export type EventPhase = 'start' | 'end';
export interface Player {
  play(events: SoundEvent[]): void;
  pause(): void;
  resume(): void;
  stop(): void;
  setSpeed(n: number): void;
  onEvent(callback: (event: SoundEvent, phase: EventPhase) => void): void; // phase: ADDITION
}
export function createPlayer(audioContext: AudioContext): Player;
```

`sonifyError` takes `options?` as an addition to the contract's
`(tree, line)` so reduced-sound mode (S-21) works. It is optional, so
contract callers still compile.

## Data flow

```
CodeTree (parser)
   |
   +--> mapping/ (pure, deterministic)
   |      pitch.ts       depth -> Hz               (S-1, S-2)
   |      timbre.ts      kind -> events template   (S-3 to S-10)
   |      layout.ts      slots, noteMs, limit      (S-11 to S-15)  [Q-S4]
   |      level.ts       gain, reduced sound       (S-16, S-17)
   |      error.ts       tritone                   (S-19 to S-21)
   |      order.ts       sorting, round2           (S-14, S-28)
   |      describe.ts    text equivalents          (S-29, S-30)
   |
   v
SoundEvent[] ---> UI/navigation call player.play(events)
                       |
                       v
               player/  (only code that touches AudioContext)
                  synth.ts      Timbre -> oscillator graph (synthesis table)
                  scheduler.ts  offsets, speed, fades
                  player.ts     state machine, stop, onEvent
```

The mapping layer imports from the parser only through `src/parser/index.ts`
(`nodeAtLine`, `describeNode`, `firstChild`, `nextSibling`) and types from
`src/shared/types.ts`. It never imports the player.

## Synthesis table (player only, from the steering Table)

| Timbre | Oscillator | Filter | Envelope or modulation |
| --- | --- | --- | --- |
| module | sine | none | attack 80 ms |
| class | triangle | none | attack 60 ms, long release (PENDING Q-S5) |
| function | square | low-pass 1500 Hz | attack 10 ms (but 15 ms fade minimum, A-S4: the longer wins, so 15 ms) |
| method | square | low-pass 800 Hz | as function |
| loop | sawtooth | low-pass 2000 Hz | one pulse per event |
| conditional | triangle | none | two events, fifth apart |
| try | sine | none | 5 Hz vibrato (depth PENDING Q-S5) |
| call | triangle | none | 40 ms decay |
| assignment | sine | none | 30 ms tick |
| return | sine | none | two events, falling |
| import | sine (two oscillators: f and 2f) | none | 120 ms chime |
| error-sine | sine | none | 4 Hz tremolo |
| error-saw | sawtooth | none | 4 Hz tremolo |

The player clamps gain to 0.4 again at the gain node, regardless of input.

## Event layout (proposal under A-S6, finalised by Q-S4)

Overview: pre-order walk of sound-producing nodes. Node k occupies slot
`[k * noteMs, (k + 1) * noteMs)`. Multi-event nodes subdivide per Table
values (loop at 110 ms steps, import together, conditional and return per
Q-S5). How they interact with the slot and with the 10-second cap is exactly
Q-S4, so `layout.ts` is not implemented until that is answered.

## Independent testability

- Mapping tests use hand-written `CodeTree` literals in
  `src/sonification/fixtures/trees.ts` (flat module, nested function with
  loop and conditional, 200-node wide tree, 300-node tree for the limit, one
  tree per kind). They do not call `parse`.
- Player tests use a hand-written `MockAudioContext` that records created
  oscillators, gain nodes, panners, `start`/`stop` calls and scheduled times,
  and exposes `currentTime`, `state`, `resume`, `suspend`. No real audio.
- Determinism test (`sonification.determinism.test.ts`) satisfies the
  `npm run test:determinism` filter.

## Correctness properties

Live in `sonification.property.test.ts`, 200+ cases, shrunk counterexamples
saved as fixtures, failures logged in `docs/pbt-findings.md`. Trees come from
an arbitrary that builds valid `CodeTree` literals (random kinds, nesting up
to depth 25, 1 to 400 nodes).

| Id | Property | Requirement |
| --- | --- | --- |
| SP-1 | For all depths 0 to 100, frequency equals the formula, rounded, and is at most the depth-14 value. | S-1 |
| SP-2 | For all depth pairs a <= b, freq(a) <= freq(b). | S-2 |
| SP-3 | For all trees, `noteMs` is within [60, 220] and equals the formula. | S-11 |
| SP-4 | For all trees, `max(startOffsetMs + durationMs) <= 10000`. (blocked by Q-S4) | S-12 |
| SP-5 | For all trees with nodeCount >= 167, every event's node has depth <= 2 and `describeOverview` is the S-13 sentence; for fewer, no depth filter. | S-13 |
| SP-6 | For all trees, output is sorted by (startOffsetMs, nodeId, frequencyHz). | S-14 |
| SP-7 | For all trees, sibling events keep source order and pans follow the formula within [-0.8, 0.8]; single child gives 0. | S-15 |
| SP-8 | For all trees and both option values, `0 < gain <= 0.4`. | S-16 |
| SP-9 | For all trees, reduced events are exactly half duration and gain (round2). | S-17 |
| SP-10 | For all trees and all integer lines (including 0, negative, past the end), `sonifyError` returns the same two-event pattern. | S-19 |
| SP-11 | For all trees, no event from `sonifyTree` or `sonifyNode` has an error timbre or the 311.13 plus 440 pair. | S-20 |
| SP-12 | For all trees and ids (valid or random), `sonifyNode` returns `[]` for unknown ids and starts with the node's own events for known ids. | S-22, S-23, S-24 |
| SP-13 | For all trees, two calls give deep-equal and string-identical output; a key-shuffled copy of the tree gives equal output. | S-25, S-27 |
| SP-14 | For all trees, every numeric field satisfies `x === round2(x)`. | S-28 |
| SP-15 | For all trees and events, `describeSoundEvent` meets S-29. | S-29 |
| SP-16 | For all random operation sequences on a mock context, the player never throws, ends in a valid state, and after `stop()` has zero active nodes; second `stop()` is a no-op. | S-34, S-38 |
| SP-17 | For all event lists and speeds in [0.5, 2], each scheduled start equals `t0 + offset / 1000 / speed`, and no gain node peak exceeds 0.4. | S-32 |

Unit tests (not properties): the Table row by row; the exact error cue;
the fade envelope calls; `resume()` when suspended; `onEvent` ordering.

## Failure behavior

- `AudioContext` closed or `resume()` rejects: `play` does not throw; the UI
  shows `Audio could not start. Use the text descriptions instead.` (UI spec).
- Empty tree (only root): `sonifyTree` returns the root's single event.
