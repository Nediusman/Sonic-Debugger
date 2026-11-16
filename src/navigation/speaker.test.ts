import { describe, expect, it } from "vitest";
import { createSpeaker, SPEECH_UNSUPPORTED_MESSAGE } from "./index";
import { FakeSynth } from "./fixtures/fakes";

describe("speaker (N-34 to N-38)", () => {
  it("is off by default and silent", () => {
    const synth = new FakeSynth();
    const s = createSpeaker(synth);
    s.speak("hello");
    expect(s.enabled).toBe(false);
    expect(synth.spoken).toBe(0);
  });
  it("speaks at the clamped rate with language en", () => {
    const synth = new FakeSynth();
    const s = createSpeaker(synth);
    s.setEnabled(true);
    s.setRate(5);
    s.speak("hello");
    expect(synth.queue).toEqual([{ text: "hello", rate: 2, lang: "en" }]);
    s.setRate(0.1);
    s.speak("again");
    expect(synth.queue).toEqual([{ text: "again", rate: 0.5, lang: "en" }]);
  });
  it("cancels the current utterance before speaking", () => {
    const synth = new FakeSynth();
    const s = createSpeaker(synth);
    s.setEnabled(true);
    s.speak("one");
    s.speak("two");
    expect(synth.queue.map((u) => u.text)).toEqual(["two"]);
  });
  it("cancel stops speech; disabling cancels", () => {
    const synth = new FakeSynth();
    const s = createSpeaker(synth);
    s.setEnabled(true);
    s.speak("one");
    s.cancel();
    expect(synth.queue).toEqual([]);
    s.speak("two");
    s.setEnabled(false);
    expect(synth.queue).toEqual([]);
  });
  it("reports unsupported and stays off without throwing", () => {
    const s = createSpeaker(undefined);
    s.setEnabled(true);
    s.speak("x");
    s.cancel();
    expect(s.supported).toBe(false);
    expect(s.enabled).toBe(false);
    expect(SPEECH_UNSUPPORTED_MESSAGE).toBe("Speech is not supported in this browser");
  });
  it("survives a synthesizer that throws", () => {
    const s = createSpeaker({ speak: () => { throw new Error("x"); }, cancel: () => { throw new Error("y"); } });
    s.setEnabled(true);
    expect(() => s.speak("x")).not.toThrow();
  });
});
