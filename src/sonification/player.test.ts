import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayer, sonifyError, sonifyTree, type SoundEvent } from "./index";
import { MockAudioContext } from "./fixtures/mockAudio";
import { flatTree, nestedTree } from "./fixtures/trees";

const ev = (over: Partial<SoundEvent> = {}): SoundEvent => ({
  nodeId: "n1", startOffsetMs: 0, durationMs: 100, frequencyHz: 220, timbre: "function", gain: 0.25, stereoPan: 0.3, ...over,
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("player", () => {
  it("touches no audio node before play (S-31)", () => {
    const ctx = new MockAudioContext();
    createPlayer(ctx.asContext());
    expect(ctx.oscillators).toHaveLength(0);
    expect(ctx.gains).toHaveLength(0);
    expect(ctx.resumeCalls).toBe(0);
  });
  it("resumes a suspended context on play (S-33)", () => {
    const ctx = new MockAudioContext();
    ctx.state = "suspended";
    createPlayer(ctx.asContext()).play([ev()]);
    expect(ctx.resumeCalls).toBe(1);
  });
  it("schedules oscillator, panner and fades (S-18, S-32)", () => {
    const ctx = new MockAudioContext();
    createPlayer(ctx.asContext()).play([ev({ startOffsetMs: 500 })]);
    const osc = ctx.oscillators[0];
    expect(osc.type).toBe("square");
    expect(osc.frequency.calls[0].value).toBe(220);
    expect(osc.startTime).toBeCloseTo(0.55);
    expect(ctx.panners[0].pan.calls[0].value).toBe(0.3);
    expect(ctx.filters[0].frequency.calls[0].value).toBe(1500);
    const ramps = ctx.gains[0].gain.calls;
    expect(ramps[0]).toMatchObject({ op: "set", value: 0 });
    expect(ramps[1].time - ramps[0].time).toBeGreaterThanOrEqual(0.015);
    expect(ramps.at(-1)).toMatchObject({ op: "ramp", value: 0 });
    expect(ramps.at(-1)!.time - ramps.at(-2)!.time).toBeGreaterThanOrEqual(0.0149);
  });
  it("clamps gain to 0.4 at the gain node", () => {
    const ctx = new MockAudioContext();
    createPlayer(ctx.asContext()).play([ev({ gain: 5 })]);
    expect(Math.max(...ctx.gains[0].gain.calls.map((c) => c.value))).toBe(0.4);
  });
  it("speed scales time, not pitch (S-36)", () => {
    const ctx = new MockAudioContext();
    const player = createPlayer(ctx.asContext());
    player.setSpeed(10);
    player.play([ev({ startOffsetMs: 1000 })]);
    expect(ctx.oscillators[0].startTime).toBeCloseTo(0.05 + 0.5);
    expect(ctx.oscillators[0].frequency.calls[0].value).toBe(220);
  });
  it("synthesises error cue with tremolo and try with vibrato (S-10, S-19)", () => {
    const ctx = new MockAudioContext();
    const player = createPlayer(ctx.asContext());
    player.play(sonifyError(nestedTree, 1));
    expect(ctx.oscillators.filter((o) => o.frequency.calls[0].value === 4)).toHaveLength(2);
    const ctx2 = new MockAudioContext();
    createPlayer(ctx2.asContext()).play([ev({ timbre: "try" })]);
    expect(ctx2.oscillators.some((o) => o.frequency.calls[0].value === 5)).toBe(true);
  });
  it("pause suspends and resume resumes (S-35)", () => {
    const ctx = new MockAudioContext();
    const player = createPlayer(ctx.asContext());
    player.play([ev()]);
    player.pause();
    expect(ctx.suspendCalls).toBe(1);
    player.resume();
    expect(ctx.resumeCalls).toBe(1);
  });
  it("stop silences everything and a second stop is a no-op (S-34)", () => {
    const ctx = new MockAudioContext();
    const player = createPlayer(ctx.asContext());
    player.play(sonifyTree(flatTree));
    const seen: string[] = [];
    player.onEvent((_e, phase) => seen.push(phase));
    player.stop();
    expect(ctx.activeOscillators()).toHaveLength(0);
    const stops = ctx.oscillators.map((o) => o.stopTimes.length);
    player.stop();
    expect(ctx.oscillators.map((o) => o.stopTimes.length)).toEqual(stops);
    ctx.currentTime = 100;
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([]);
  });
  it("reports start then end in order (S-37)", () => {
    const ctx = new MockAudioContext();
    const player = createPlayer(ctx.asContext());
    const seen: string[] = [];
    player.onEvent((e, phase) => seen.push(`${e.nodeId}:${phase}`));
    player.play([ev({ nodeId: "a" }), ev({ nodeId: "b", startOffsetMs: 100 })]);
    ctx.currentTime = 1;
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual(["a:start", "a:end", "b:start", "b:end"]);
  });
  it("does not throw when the context is closed", () => {
    const ctx = new MockAudioContext();
    ctx.createOscillator = () => { throw new Error("closed"); };
    expect(() => createPlayer(ctx.asContext()).play([ev()])).not.toThrow();
  });
});
