import { describe, expect, it } from "vitest";
import { clampLine, lineCount, parseFrames, syntaxFrame } from "./traceback";

const TRACE = `  File "<exec>", line 5, in _run
  File "main.py", line 12, in <module>
  File "main.py", line 11, in main
  File "/lib/python312.zip/json/decoder.py", line 3, in decode
  File "main.py", line 4, in process
`;

describe("traceback", () => {
  it("keeps only main.py frames, outermost first (E-5, E-6)", () => {
    expect(parseFrames(TRACE, 12)).toEqual([
      { file: "main.py", line: 12, fn: "<module>" },
      { file: "main.py", line: 11, fn: "main" },
      { file: "main.py", line: 4, fn: "process" },
    ]);
  });
  it("clamps lines into the source range", () => {
    expect(parseFrames('  File "main.py", line 900, in f\n  File "main.py", line 0, in g', 5).map((f) => f.line)).toEqual([5, 1]);
  });
  it("returns nothing for text without frames", () => {
    expect(parseFrames("garbage", 5)).toEqual([]);
  });
  it("builds one module frame for syntax errors (E-7)", () => {
    expect(syntaxFrame(3, 10)).toEqual({ file: "main.py", line: 3, fn: "<module>" });
    expect(syntaxFrame(50, 10).line).toBe(10);
    expect(syntaxFrame(null, 10).line).toBe(1);
    expect(syntaxFrame(-4, 10).line).toBe(1);
  });
  it("counts lines like Python", () => {
    expect(lineCount("")).toBe(1);
    expect(lineCount("a\nb\r\nc\rd")).toBe(4);
    expect(clampLine(Number.NaN, 3)).toBe(1);
    expect(clampLine(2.9, 3)).toBe(2);
  });
});
