---
inclusion: manual
---

# Sonification rules: the single source of truth for the mapping

If a spec or an agent disagrees with this file, stop and ask. Values are
final unless the user changes them here.

## Pitch (nesting depth)

C major pentatonic over three octaves, starting at C3 (130.81 Hz). Scale
steps in semitones: 0, 2, 4, 7, 9, then repeat per octave. Depth 0 is the
first note, depth 14 or deeper is capped at A5 (880 Hz). Deeper is never
lower.

Formula: index = min(depth, 14); semitones = 12 * floor(index / 5) +
[0,2,4,7,9][index % 5]; frequency = 130.81 * 2^(semitones / 12). Round to two
decimals.

## Timbre (construct kind)

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

## Time, space, level

- Base note length 220 ms. Overview length is at most 10 seconds: noteMs =
  clamp(10000 / nodeCount, 60, 220). If nodeCount would need less than 60 ms
  per note, play only nodes of depth 2 or less and announce "overview limited
  to top-level constructs, N in total".
- Siblings play in source order. Stereo pan = -0.8 + 1.6 * i / (n - 1) for
  sibling i of n, and 0 when n is 1.
- Default gain 0.25, hard maximum 0.4, 15 ms fade in and out on every event.
  Reduced-sound mode halves durations and gain.

## Error cue

A tritone: 311.13 Hz and 440 Hz sounded together, sine plus sawtooth, 600 ms,
with 4 Hz tremolo, gain 0.4. No normal node may use this combination.

## Determinism

No Math.random, no Date.now, no dependence on the machine in the mapping
layer. Round all computed numbers to two decimals. Sort events by
startOffsetMs, then by node id.
