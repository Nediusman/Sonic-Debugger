# Sonification spec: requirements

Module: `src/sonification`. Owner: sonification agent.
Input: `CodeTree` (from the parser). Output: `SoundEvent[]`, plus a Web Audio
player. The mapping layer is pure and deterministic. The player is the only
part that touches `AudioContext`.

Single source of truth for every value: `.kiro/steering/sonification-rules.md`.
Where that file is silent, this spec marks the value **PENDING** with a
question id. No value is invented. `[PBT]` marks invariants for property tests.

`round2(x) = Math.round(x * 100) / 100` (assumption A-S1; the steering file
says "round to two decimals" without a mode).

## Mapping (copied from sonification-rules.md)

### Pitch (nesting depth)

C major pentatonic over three octaves, starting at C3 (130.81 Hz). Scale
steps in semitones: 0, 2, 4, 7, 9, then repeat per octave. Depth 0 is the
first note, depth 14 or deeper is capped at A5 (880 Hz). Deeper is never
lower.

Formula: index = min(depth, 14); semitones = 12 * floor(index / 5) +
[0,2,4,7,9][index % 5]; frequency = 130.81 * 2^(semitones / 12). Round to two
decimals.

### Timbre (construct kind)

| Kind | Waveform | Character |
| --- | --- | --- |
| module | sine | Soft pad, 80 ms attack |
| class | triangle | Slow 60 ms attack, long release |
| function | square, low-pass 1500 Hz | Firm, 10 ms attack |
| method | square, low-pass 800 Hz | Darker than function |
| loop | sawtooth, low-pass 2000 Hz | 3-pulse rhythm, one pulse every 110 ms, then the body once |
| conditional | triangle | Two notes a perfect fifth apart: rising for the if branch, falling for else |
| try | sine with 5 Hz vibrato | Wavering, signals risk |
| call | triangle | Short pluck, 40 ms decay |
| assignment | sine | 30 ms tick |
| return | sine | Falling two-note end marker |
| import | sine plus octave | 120 ms chime |

### Time, space, level

- Base note length 220 ms. Overview length is at most 10 seconds: noteMs =
  clamp(10000 / nodeCount, 60, 220). If nodeCount would need less than 60 ms
  per note, play only nodes of depth 2 or less and announce "overview limited
  to top-level constructs, N in total".
- Siblings play in source order. Stereo pan = -0.8 + 1.6 * i / (n - 1) for
  sibling i of n, and 0 when n is 1.
- Default gain 0.25, hard maximum 0.4, 15 ms fade in and out on every event.
  Reduced-sound mode halves durations and gain.

### Error cue

A tritone: 311.13 Hz and 440 Hz sounded together, sine plus sawtooth, 600 ms,
with 4 Hz tremolo, gain 0.4. No normal node may use this combination.

### Determinism

No Math.random, no Date.now, no dependence on the machine in the mapping
layer. Round all computed numbers to two decimals. Sort events by
startOffsetMs, then by node id.

## Requirements

### Pitch

- **S-1 [PBT]** When an event is created for a node of depth `d >= 0`, the
  mapping layer shall set `frequencyHz` to the pitch formula applied to `d`,
  rounded to two decimals. Anchor: depth 0 gives 130.81.
- **S-2 [PBT]** When two nodes have depths `a <= b`, the mapping layer shall
  give the node at `b` a base frequency greater than or equal to the one at
  `a` (deeper is never lower). For `d >= 14` the frequency equals the depth-14
  frequency.

### Timbre

- **S-3** When an event is created for a node of kind K (K is not `other`),
  the mapping layer shall set `timbre` to K and the Table above shall define
  its sound. The player shall synthesise each timbre as that row states.
- **S-4** When a node has kind `other`, the mapping layer shall produce no
  events for it. **PENDING Q-S1** (the steering file has no row for `other`).
- **S-5** When a `loop` node is sonified, the mapping layer shall produce three
  pulses spaced 110 ms apart, at the node's pitch; the body (its children)
  then plays by the normal sibling order. Pulse duration: **PENDING Q-S5**.
- **S-6** When a `conditional` node is sonified, the mapping layer shall
  produce two notes a perfect fifth apart (7 semitones, equal tempered:
  ratio 2^(7/12), assumption A-S2). For nodes named `if` and `elif` the pair
  rises (node pitch, then the fifth above). For a node named `else` the pair
  falls (the fifth above, then node pitch). Note durations: **PENDING Q-S5**.
- **S-7** When a `return` node is sonified, the mapping layer shall produce a
  falling two-note marker. Interval and durations: **PENDING Q-S5**.
- **S-8** When an `import` node is sonified, the mapping layer shall produce a
  sine at the node's pitch and a sine one octave above (2x frequency), both
  starting together, with durationMs 120.
- **S-9** When a `call` node is sonified, the mapping layer shall produce one
  event with a 40 ms decay envelope. When an `assignment` node is sonified, one
  event with durationMs 30.
- **S-10** When a `try` node is sonified, the mapping layer shall produce one
  event whose timbre `try` the player renders with 5 Hz vibrato. Vibrato depth:
  **PENDING Q-S5**.

### Time and order

- **S-11 [PBT]** When `sonifyTree` is called, the mapping layer shall compute
  `noteMs = round2(clamp(10000 / nodeCount, 60, 220))`, where `nodeCount` is
  the number of nodes that produce sound (Q-S7), and shall use `noteMs` as the
  duration of single-event nodes not given a fixed duration above.
- **S-12 [PBT]** When `sonifyTree` is called, the mapping layer shall return
  events with `startOffsetMs + durationMs <= 10000` for every event. **BLOCKED
  by Q-S4** (how multi-event nodes fit a slot).
- **S-13 [PBT]** When `10000 / nodeCount < 60` (nodeCount of 167 or more), the
  mapping layer shall emit only events for nodes of depth 2 or less, and
  `describeOverview(tree)` shall return exactly
  `overview limited to top-level constructs, N in total` with N =
  `nodeCount` (Q-S7).
- **S-14 [PBT]** When events are returned by any `sonify*` function, the
  mapping layer shall sort them by `startOffsetMs` ascending, then by
  `nodeId` ascending (plain string comparison), then by `frequencyHz`
  ascending (tie-break, assumption A-S3).
- **S-15 [PBT]** When siblings of one parent are sonified, the mapping layer
  shall play them in source order (a later sibling never starts before an
  earlier one) and shall set `stereoPan = round2(-0.8 + 1.6 * i / (n - 1))`
  for sibling `i` (0-based) of `n`, and `0` when `n` is 1. The root has pan 0.
  Every pan is in `[-0.8, 0.8]`.

### Level

- **S-16 [PBT]** When any `sonify*` function returns events, every event shall
  have `0 < gain <= 0.4`. Default gain is 0.25 (Q-S6 on per-kind variation).
- **S-17 [PBT]** When the option `reducedSound: true` is given, the mapping
  layer shall return for every event `durationMs = round2(d / 2)` and
  `gain = round2(g / 2)`, where `d` and `g` are the values without the
  option, and the same `startOffsetMs` ordering by node.
- **S-18** When the player schedules any event, the player shall apply a 15 ms
  fade in and a 15 ms fade out. Where a timbre's attack in the Table is longer
  than 15 ms, the longer attack applies (assumption A-S4).

### Error cue

- **S-19 [PBT]** When `sonifyError(tree, line)` is called with any integer
  line, the mapping layer shall return exactly two events at `startOffsetMs`
  0: `{frequencyHz: 311.13, timbre: 'error-sine'}` and
  `{frequencyHz: 440, timbre: 'error-saw'}`, each with `durationMs` 600 and
  `gain` 0.4. The player shall render both with 4 Hz tremolo. Their `nodeId`
  is `nodeAtLine(tree, line)` or the root when that is `null`; `stereoPan`
  follows S-15 for that node.
- **S-20 [PBT]** When any function other than `sonifyError` returns events,
  the mapping layer shall not return an event with timbre `error-sine` or
  `error-saw`, nor a pair of simultaneous events at 311.13 and 440.
- **S-21** When `reducedSound: true` is given to `sonifyError`, the mapping
  layer shall halve duration and gain as in S-17 (gain 0.2, duration 300).

### Focus mode

- **S-22** When `sonifyNode(tree, nodeId)` is called with an existing id, the
  mapping layer shall return the node's own events starting at offset 0,
  followed by the events of each direct child in source order, each child
  starting after the previous child's last event ends. **PENDING Q-S2**
  (the steering file does not define focus mode; this is my proposal).
- **S-23 [PBT]** When `sonifyNode` is called with an id not in the tree, the
  mapping layer shall return `[]` and shall not throw.
- **S-24 [PBT]** When `sonifyNode(tree, id)` is called, the node's own events
  shall equal the events `sonifyTree` produces for that node, except for
  `startOffsetMs`, and except that duration uses 220 ms (not `noteMs`).

### Determinism

- **S-25 [PBT]** When `sonifyTree`, `sonifyNode`, or `sonifyError` is called
  twice with equal arguments, the mapping layer shall return deep-equal
  arrays, and `JSON.stringify` of both shall be identical.
- **S-26** The files in `src/sonification/mapping/` shall not reference
  `Math.random`, `Date`, `performance`, `Intl`, `toLocale*`, or `process`
  (static test over the source text, run by `npm run test:determinism`).
- **S-27 [PBT]** When `sonifyTree` is called with a tree and with a deep copy
  of it whose object keys were inserted in a different order, the mapping layer
  shall return equal arrays.
- **S-28 [PBT]** When any computed number is returned, the mapping layer shall
  have rounded it to two decimals: `x === round2(x)`.

### Text equivalent

- **S-29 [PBT]** When `describeSoundEvent(event, tree)` is called with any
  event produced by a `sonify*` function for that tree, the mapping layer shall
  return a non-empty single-line string that contains the parser's
  `describeNode` text for `event.nodeId` (or, for error timbres, the words
  `error cue`), the frequency with the word `hertz`, and one of `left`,
  `center`, `right` (pan below -0.2, between, above 0.2). It shall return the
  same string on each call.
- **S-30** When `describeOverview(tree, options?)` is called, the mapping layer
  shall return a sentence in the form `Overview: N constructs, about S seconds`
  (S rounded to the nearest whole second), or the S-13 sentence when limited.
  (`describeOverview` is an addition: Q-S8.)

### Player

- **S-31** When `createPlayer(audioContext)` is called, the player shall not
  create an `AudioContext`, shall not start audio, and shall not touch any
  node of the context until `play` is called.
- **S-32 [PBT]** When `play(events)` is called, the player shall schedule each
  event with an oscillator (or two for `import`, `error-*`) at
  `t0 + startOffsetMs / 1000 / speed`, for `durationMs / 1000 / speed`
  seconds, through a gain node whose peak never exceeds 0.4, with a stereo
  panner set to `stereoPan`. Pitch does not change with speed.
- **S-33** When `play` is called while the context state is `suspended`, the
  player shall call `audioContext.resume()`. (Audio starts only from a user
  gesture; the UI calls `play` inside the gesture handler.)
- **S-34 [PBT]** When `stop()` is called in any player state, the player shall
  stop and disconnect every scheduled and active oscillator, cancel pending
  `onEvent` callbacks, and set its state to `stopped`, with no exception.
  Calling `stop()` again shall do nothing. After `stop()`, no node is active.
- **S-35** When `pause()` is called, the player shall call
  `audioContext.suspend()`. When `resume()` is called, the player shall call
  `audioContext.resume()`.
- **S-36** When `setSpeed(n)` is called, the player shall clamp `n` to
  `[0.5, 2]` (**PENDING Q-S9**) and apply it to events scheduled afterwards.
- **S-37** When an event starts or ends, the player shall call each callback
  registered with `onEvent(callback)` as `callback(event, 'start' | 'end')`.
  (Second parameter is an addition: Q-S8.)
- **S-38 [PBT]** When any sequence of `play`, `pause`, `resume`, `stop`,
  `setSpeed` calls is made on a mock `AudioContext`, the player shall not
  throw and shall end in one of `idle`, `playing`, `paused`, `stopped`.

## User-facing behavior

| Behavior | Shortcut | Announcement | Sound |
| --- | --- | --- | --- |
| Play structure overview | `P` while the tree has focus; button "Play overview" | status: `Overview: N constructs, about S seconds` (S-30), or the S-13 sentence | `sonifyTree` events |
| Play focused construct | `F` while the tree has focus; button "Play this construct" | the node's `describeNode` text | `sonifyNode` events |
| Focus cue on a move | any move key (see navigation-a11y-spec) | `announce(...)` text | the node's own events (S-24) |
| Stop all audio | `Escape` anywhere, `S` while the tree has focus; button "Stop sound" | `Sound stopped` (only if audio was playing) | none (silence) |
| Error cue | none (plays automatically after a failed run) | the narration (error-narration-spec) | `sonifyError` events (S-19) |
| Reduced sound | `M` while the tree has focus; toggle button | `Reduced sound on` / `Reduced sound off` | none |
| Event captions | none (visible text under the tree) | `describeSoundEvent` text shown as each event starts, not announced by the live region | the playing event |

The key and announcement rules themselves are specified in
navigation-a11y-spec and ui-spec.

## Assumptions

- **A-S1** `round2` uses `Math.round(x * 100) / 100`.
- **A-S2** "Perfect fifth" is the equal-tempered 7 semitones.
- **A-S3** Third sort key `frequencyHz` is mine; the steering file stops at
  node id, which leaves ties for same-node same-offset events (import,
  error cue).
- **A-S4** A 15 ms fade is the minimum envelope; longer attacks from the
  Table replace the fade in.
- **A-S5** Timbre names for `SoundEvent.timbre` are the `NodeKind` values (except
  `other`) plus `error-sine` and `error-saw`. Synthesis parameters (waveform,
  low-pass, vibrato, tremolo, attack) live in a synthesis table inside the
  player, keyed by timbre. `SoundEvent` has no fields for them.
- **A-S6** The overview plays nodes in pre-order, one slot of `noteMs` per
  node, each starting where the previous slot ended.
- **A-S7** Focus mode and overview use the node's `depth` from the parser
  unchanged (the module root is depth 0).

## Open questions (need an answer from the user)

- **Q-S1** What does `other` (with, match, raise, assert) sound like? Until
  answered it is silent and excluded from `nodeCount`.
- **Q-S2** What should `sonifyNode` (focus mode) play? My proposal is S-22.
- **Q-S3** Should the "perfect fifth" be 7 equal-tempered semitones (A-S2) or
  the just 3:2 ratio?
- **Q-S4** Conflict: a loop alone takes at least 330 ms (three pulses at 110
  ms) but `noteMs` can be 60 ms, and the total must stay at most 10 seconds.
  How should multi-event nodes (loop, conditional, return, import) fit a slot?
  Options: (a) their own length counts in the budget and `noteMs` is computed
  from total length; (b) events overlap into the next slot; (c) pulses
  compress when `noteMs` is small. S-12 is blocked until answered.
- **Q-S5** Missing numbers: loop pulse duration; conditional note durations;
  return interval and durations; try vibrato depth; class release length; call
  pluck pitch behavior; whether import's octave sine has the same gain.
- **Q-S6** Is gain 0.25 for every kind, or does each kind have its own gain?
- **Q-S7** Does `nodeCount` include the `module` root? Does N in "N in total"
  mean all constructs in the file or only those played? Proposal: count
  sound-producing nodes including the root, N = that count.
- **Q-S8** Contract additions: `describeOverview(tree, options?)`,
  `SonifyOptions`, the `Timbre` union, and `onEvent(callback)` receiving
  `(event, phase)`. contracts.md lists none of them. Approve?
- **Q-S9** Speed range for `setSpeed` (proposal 0.5 to 2).
- **Q-S10** The pitch formula gives 879.98 Hz at depth 14 (not 880) and
  439.99 Hz at depth 9. The error cue uses exactly 440. I follow the formula.
  Confirm.

## Stretch (not scheduled)

- Per-user pitch range or instrument choice.
- Spatial audio with HRTF, or sounds for `except` and `finally`.
- Exporting the overview as an audio file.
- Sonifying variable values or runtime traces.
