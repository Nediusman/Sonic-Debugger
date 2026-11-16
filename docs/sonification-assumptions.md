# Sonification assumptions

Every value the spec left open. Each also appears as an `ASSUMPTION` comment at the code that uses it. Change a number in `src/sonification/mapping/profile.ts` (or `player/synthTable.ts`) to revise it.

| Id | Decision | Where |
| --- | --- | --- |
| Q-S1 | `other` is a sine, 20 ms tick, pitch by depth. It counts in `nodeCount`. | `profile.otherMs`, `timbre.ts` |
| Q-S2 | Focus mode plays the node and all its descendants, pre-order, 220 ms notes, from 0 ms. | `layout.ts` `focusLayout` |
| Q-S3 / A-S2 | Perfect fifth is 7 equal-tempered semitones. | `profile.fifthSemitones` |
| Q-S4 | Keep the 10 s cap and the steering rule. Each kind occupies slots in the budget: loop 3, conditional 2, return 2, import 2, others 1. `noteMs = clamp(10000 / slot units, 60, 220)`. When `10000 / units < 60` (167 or more units), only depth <= 2 plays. If that still exceeds 166 units, nodes are dropped from the end of the pre-order. | `layout.ts`, `timbre.ts` `slotWeight` |
| A-S1b | `noteMs` rounds down to two decimals (not to nearest) so the total can never exceed 10 000 ms. | `layout.ts` `floor2` |
| Q-S5 loop | Pulse spacing is 110 ms, or `noteMs` when shorter. Each pulse lasts half the spacing. | `timbre.ts` |
| Q-S5 conditional | Each note lasts `noteMs`. `if`, `elif` and unnamed rise; `else` falls. | `timbre.ts` |
| Q-S5 return | Two notes of `noteMs`: node pitch, then 4 semitones lower. | `profile.returnDropSemitones` |
| Q-S5 try | Vibrato depth 30 cents at 5 Hz. | `synthTable.ts` |
| Q-S5 class | Release 200 ms. | `synthTable.ts` |
| Q-S5 call | Plain pitch by depth; 40 ms decay applied by the player. Event duration is `noteMs`. | `synthTable.ts` |
| Q-S5 import | The octave sine has the same gain as the base sine. | `timbre.ts` |
| Q-S6 | Gain 0.25 for every kind. | `profile.defaultGain` |
| Q-S7 | `nodeCount` counts all nodes, root included, since every kind now sounds. N in "N in total" is that count, even when fewer nodes play. The "167" threshold applies to slot units, not node count, because multi-event kinds use several slots. | `layout.ts` |
| Q-S8 | Contract additions used: `Timbre` (also includes `other`), `SonifyOptions`, `describeOverview`, `onEvent(cb(event, phase))`, `sonifyError(tree, line, options?)`. | `shared/types.ts`, `index.ts` |
| Q-S9 | `setSpeed` clamps to 0.5 to 2. Non-finite values are ignored. | `player.ts` |
| Q-S10 | Pitch follows the formula (439.99 at depth 9, 879.98 at depth 14+). The error cue uses exactly 440. | `pitch.ts` |
| Player | Sound starts 50 ms after `play`. Events shorter than 30 ms of audio time are stretched to 30 ms so both 15 ms fades fit. `play` while sounding stops the earlier sound first. | `player.ts` |
| Player | `Player` has no state getter (contracts.md lists none), so S-38's end states are tested through behavior: no throw, and zero active oscillators after `stop()`. | `sonification.property.test.ts` SP-16 |
| Player | Pause drives `audioContext.suspend()`. Event callbacks follow audio time, so they pause with it. | `player.ts` |
