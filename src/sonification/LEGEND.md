# Sound legend

Every sound has a spoken or written equivalent (`describeSoundEvent`). Use this text in the help dialog.

**Pitch is depth.** The higher the note, the deeper the code is nested. Notes follow a five-note scale (C major pentatonic) from C3 (131 Hz) at the top level up to A5 (880 Hz) at depth 14 and beyond. Deeper code is never lower. Nothing clashes.

**Timbre is the kind of construct.**
- Module (whole file): soft sine pad that swells in.
- Class: slow triangle with a long fade.
- Function: firm, buzzy square tone. Method: the same, but darker and duller.
- Loop: rapid three-pulse buzz (sawtooth), then its body plays once.
- Conditional (if): two soft notes a fifth apart. Rising means if or elif. Falling means else.
- Try: wavering sine with a slow vibrato. It signals risk.
- Call: short pluck. Assignment: tiny tick. Other statements: quicker, fainter tick.
- Return: two sine notes stepping down, like a full stop.
- Import: bright two-tone chime, one octave apart.

**Time is source order.** Earlier code plays earlier. The whole file plays in under 10 seconds. In a very large file only the top-level constructs play, and you hear "overview limited to top-level constructs, N in total".

**Left to right is position among siblings.** The first sibling sounds at the far left, the last at the far right. A single child sits in the center.

**Error cue.** Two harsh notes sounded together (311 Hz sine and 440 Hz sawtooth, a tritone) with a fast 4 Hz throb, louder than anything else, lasting 0.6 seconds. No normal construct can make it. It plays at the line that failed.

**Controls.** Escape or S stops all sound. Reduced sound (M) makes every note half as long and half as loud.
