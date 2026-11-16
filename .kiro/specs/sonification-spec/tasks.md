# Sonification spec: tasks

Order: slice 1 (S-T1 to S-T4) plays a pitch-correct, deterministic sound for
a hand-built tree through the real player, so the UI can demo audio early.
Tick a task only when its code, tests, `npm run typecheck`, `npm test`,
`npm run lint:a11y`, and `npm run test:determinism` pass.
Commit prefix: `feat(sonification):`, `test(sonification):`.

Blocked until the user answers: S-T7 (Q-S4, Q-S5), part of S-T5 (Q-S1,
Q-S2, Q-S5). Do not guess; stop and report.

## Slice 1: smallest end-to-end

- [x] **S-T1 Shared types.** Add `Timbre`, `SoundEvent`, `SonifyOptions` to
  `src/shared/types.ts` as in design.md (explicitly allowed here). Needs Q-S8
  answered. Reqs: S-3, S-16.
- [x] **S-T2 Pitch and rounding.** `mapping/pitch.ts` (formula, cap),
  `mapping/order.ts` (`round2`, sort). Table-driven unit test for depth 0 to
  15 (130.81, 146.83, 164.81, 195.99, 220, 261.62, 293.66, 329.62, 391.99,
  439.99, 523.24, 587.32, 659.24, 783.97, 879.98, 879.98). Reqs: S-1, S-2,
  S-14, S-28.
- [x] **S-T3 Minimal sonifyTree.** One event per sound-producing node, kinds
  with a single event only (module, class, function, method, try, call,
  assignment), `noteMs` formula, sibling pan, gain 0.25. Fixture trees as
  literals. Export from `index.ts`. Reqs: S-3, S-11, S-15, S-16.
- [x] **S-T4 Minimal player.** `createPlayer` with `MockAudioContext`:
  `play`, `stop`, `setSpeed`, scheduling, 15 ms fades, gain clamp, `resume`
  on suspended, no audio before `play`. Reqs: S-18, S-31, S-32, S-33, S-34,
  S-36.

Handoff after S-T4: UI can wire "Play overview" and "Stop sound".

## Slice 2: full mapping

- [x] **S-T5 Multi-event kinds.** loop pulses, conditional rising/falling,
  return, import (two sines). Skip any value marked PENDING; stop and ask.
  Reqs: S-5, S-6, S-7, S-8, S-9, S-10.
- [x] **S-T6 `other` kind and nodeCount.** Implement the Q-S1 and Q-S7
  answers. Reqs: S-4, S-11.
- [x] **S-T7 Overview budget and limit.** `layout.ts` per Q-S4: 10-second cap,
  60 ms floor, depth <= 2 filter, `describeOverview`. Reqs: S-12, S-13,
  S-30.
- [x] **S-T8 Error cue.** `sonifyError` with the two events and fallback to the
  root. Reqs: S-19, S-20, S-21.
- [x] **S-T9 Focus mode.** `sonifyNode` per Q-S2. Reqs: S-22, S-23, S-24.
- [x] **S-T10 Reduced sound.** Option handling for all three functions.
  Reqs: S-17, S-21.
- [x] **S-T11 Text equivalents.** `describeSoundEvent`. Reqs: S-29.

## Slice 3: player completeness and quality

- [x] **S-T12 Player synthesis.** Synthesis table: filters, vibrato, tremolo,
  chime, attack lengths, `pause`, `resume`, `onEvent(event, phase)`.
  Reqs: S-3, S-10, S-18, S-35, S-37.
- [x] **S-T13 Tree arbitrary.** `fixtures/arbitraries.ts` producing random
  valid `CodeTree` literals. Reqs: all [PBT].
- [x] **S-T14 Property tests.** SP-1 to SP-17 in
  `sonification.property.test.ts`; regression fixtures; log findings in
  `docs/pbt-findings.md`. Reqs: all [PBT].
- [x] **S-T15 Determinism checks.** Static scan of `mapping/` for banned
  identifiers and a double-run test, named so `npm run test:determinism`
  runs them. Reqs: S-25, S-26, S-27.
- [x] **S-T16 Docs.** `src/sonification/README.md`: the mapping table copy,
  public API, how to run the tests.

## Stretch (not scheduled)

- Custom instrument or pitch range.
- Audio export.
- Sounds for `except` and `finally`.
