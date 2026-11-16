import { describe, expect, it } from "vitest";
import { REALISTIC } from "../fixtures/runs";
import { ENCYCLOPEDIA_TYPES, offlineText } from "./encyclopedia";
import { WORD_LIMITS, toSpeech } from "./sanitize";

const words = (text: string) => text.split(" ").length;

describe("encyclopedia", () => {
  it("has every type required by E-21", () => {
    expect([...ENCYCLOPEDIA_TYPES].sort()).toEqual(Object.keys(REALISTIC).sort());
  });

  it.each(Object.entries(REALISTIC))("%s renders without placeholders and within limits", (type, message) => {
    for (const line of [14, null]) {
      const text = offlineText({ type, message, frames: [] }, line);
      for (const value of Object.values(text)) {
        expect(value).not.toMatch(/[{}]/);
        expect(value).toBe(toSpeech(value));
        expect(value).not.toBe("");
      }
      expect(words(text.summary)).toBeLessThanOrEqual(WORD_LIMITS.summary);
      expect(words(text.cause)).toBeLessThanOrEqual(WORD_LIMITS.cause);
      expect(words(text.suggestedFix)).toBeLessThanOrEqual(WORD_LIMITS.suggestedFix);
    }
  });

  it("fills names from the message (E-22)", () => {
    const text = offlineText({ type: "NameError", message: "name 'total' is not defined", frames: [] }, 4);
    expect(text.cause).toBe("The name total is likely misspelled or not defined before line 4 uses it.");
    expect(text.suggestedFix).toBe("Check the spelling of total, or define it before line 4.");
  });

  it("uses a variant without the name when none can be extracted", () => {
    const text = offlineText({ type: "NameError", message: "something odd", frames: [] }, 4);
    expect(text.cause).toBe("A name is likely misspelled or not defined before line 4 uses it.");
    expect(text.suggestedFix).toContain("the name");
  });

  it("says the failing line when the line is unknown", () => {
    const text = offlineText({ type: "ZeroDivisionError", message: "division by zero", frames: [] }, null);
    expect(text.cause).toContain("the failing line");
  });

  it("keeps only the file name for FileNotFoundError", () => {
    const text = offlineText({ type: "FileNotFoundError", message: REALISTIC.FileNotFoundError, frames: [] }, 2);
    expect(text.cause).toContain("input.csv");
    expect(text.cause).not.toContain("/home");
  });

  it("extracts attribute, module and key names", () => {
    expect(offlineText({ type: "AttributeError", message: REALISTIC.AttributeError, frames: [] }, 1).cause).toContain("push");
    expect(offlineText({ type: "ModuleNotFoundError", message: REALISTIC.ModuleNotFoundError, frames: [] }, 1).cause).toContain("numpyy");
    expect(offlineText({ type: "KeyError", message: "'apple'", frames: [] }, 1).cause).toContain("apple");
  });

  it("uses the generic entry for unknown, odd and prototype-like types", () => {
    for (const type of ["MyCustomError", "", "constructor", "__proto__", "toString"]) {
      const text = offlineText({ type, message: "x", frames: [] }, 3);
      expect(text.summary).toBe("The program stopped with an unexpected error.");
      expect(text.cause).not.toMatch(/[{}]/);
    }
    expect(offlineText({ type: "MyCustomError", message: "", frames: [] }, 3).cause).toContain("MyCustomError");
  });

  it("is deterministic", () => {
    const error = { type: "KeyError", message: "'a'", frames: [] };
    expect(offlineText(error, 5)).toEqual(offlineText(error, 5));
  });
});
