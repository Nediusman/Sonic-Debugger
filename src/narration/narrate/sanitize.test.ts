import { describe, expect, it } from "vitest";
import { limitWords, speechField, toSpeech } from "./sanitize";

describe("toSpeech", () => {
  it("removes markdown, code fences, angle brackets and braces", () => {
    expect(toSpeech("Use `x` **now** # {y} <z>")).toBe("Use x now y z");
  });
  it("joins lines and trims", () => {
    expect(toSpeech("  one\n\ntwo\tthree  ")).toBe("one two three");
  });
  it("keeps only the file name of long paths", () => {
    expect(toSpeech("Open /home/user/project/data.csv now")).toBe("Open data.csv now");
    expect(toSpeech("C:\\Users\\me\\a.py failed")).toBe("a.py failed");
  });
  it("leaves and/or alone", () => {
    expect(toSpeech("this and/or that")).toBe("this and/or that");
  });
  it("replaces control characters", () => {
    expect(toSpeech("a\u0000b\u001bc")).toBe("a b c");
  });
});

describe("limitWords", () => {
  it("keeps short text unchanged", () => {
    expect(limitWords("one two three", 3)).toBe("one two three");
  });
  it("cuts at a word boundary and ends with a period", () => {
    expect(limitWords("one two three four", 2)).toBe("one two.");
  });
  it("drops trailing punctuation before the period", () => {
    expect(limitWords("one, two, three", 2)).toBe("one, two.");
  });
  it("handles empty text", () => {
    expect(limitWords("", 5)).toBe("");
  });
});

describe("speechField", () => {
  it("sanitises then limits", () => {
    expect(speechField("`a` b\nc d e", 3)).toBe("a b c.");
  });
});
