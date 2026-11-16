import { describe, expect, it } from "vitest";
import { normalizeRun } from "./normalize";

const src = "a\nb\nc";

describe("normalizeRun", () => {
  it("returns ok for a clean run", () => {
    expect(normalizeRun(src, { stdout: "hi\n", error: null })).toEqual({ ok: true, source: src, stdout: "hi\n" });
  });
  it("builds the error with user frames (E-5)", () => {
    const raw = { stdout: "", error: { type: "NameError", message: "name 'x' is not defined", traceback: '  File "main.py", line 2, in <module>\n' } };
    expect(normalizeRun(src, raw).error).toEqual({
      type: "NameError",
      message: "name 'x' is not defined",
      frames: [{ file: "main.py", line: 2, fn: "<module>" }],
    });
  });
  it.each(["SyntaxError", "IndentationError", "TabError"])("gives %s a single clamped frame (E-7)", (type) => {
    const result = normalizeRun(src, { stdout: "", error: { type, message: "bad", traceback: '  File "main.py", line 1, in f\n', lineno: 99 } });
    expect(result.error?.frames).toEqual([{ file: "main.py", line: 3, fn: "<module>" }]);
  });
  it("truncates stdout at 10000 characters (E-4)", () => {
    const result = normalizeRun(src, { stdout: "x".repeat(10001), error: null });
    expect(result.stdout).toBe(`${"x".repeat(10000)}\n[output truncated]`);
    expect(normalizeRun(src, { stdout: "x".repeat(10000), error: null }).stdout).toHaveLength(10000);
  });
  it("turns garbage into a valid failure", () => {
    for (const raw of [null, undefined, 5, "x", [1]]) {
      const result = normalizeRun(src, raw);
      expect(result).toMatchObject({ ok: false, source: src, stdout: "" });
      expect(result.error?.frames).toEqual([]);
    }
    expect(normalizeRun(src, { stdout: 5, error: "boom" })).toMatchObject({ ok: false, stdout: "" });
  });
  it("caps type and message length and defaults the type", () => {
    const result = normalizeRun(src, { error: { type: "", message: "m".repeat(5000), traceback: 3 } });
    expect(result.error?.type).toBe("Error");
    expect(result.error?.message).toHaveLength(1000);
    expect(result.error?.frames).toEqual([]);
  });
});
