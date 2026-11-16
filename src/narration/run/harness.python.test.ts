import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { HARNESS } from "./harness";
import { normalizeRun } from "./normalize";

function hasPython(): boolean {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Runs the real harness under CPython (not Pyodide) and normalises the result. */
function run(source: string) {
  const script = `${HARNESS}\nimport sys\nprint(_run(sys.stdin.read()))`;
  const out = execFileSync("python3", ["-c", script], { input: source, encoding: "utf8" });
  return normalizeRun(source, JSON.parse(out.trim().split("\n").at(-1) ?? "null"));
}

describe.skipIf(!hasPython())("harness under CPython", () => {
  it("captures stdout and stderr in order", () => {
    const result = run("import sys\nprint('a')\nprint('b', file=sys.stderr)\nprint('c')");
    expect(result).toEqual({ ok: true, source: result.source, stdout: "a\nb\nc\n" });
  });
  it("reports a NameError with only user frames", () => {
    const result = run("def f():\n    return total\nf()");
    expect(result.error).toEqual({
      type: "NameError",
      message: "name 'total' is not defined",
      frames: [{ file: "main.py", line: 3, fn: "<module>" }, { file: "main.py", line: 2, fn: "f" }],
    });
  });
  it("reports syntax and indentation errors with one frame (E-7)", () => {
    expect(run("x = (1,\nprint(x").error?.frames).toHaveLength(1);
    const indent = run("def f():\nreturn 1");
    expect(indent.error?.type).toBe("IndentationError");
    expect(indent.error?.frames).toEqual([{ file: "main.py", line: 2, fn: "<module>" }]);
  });
  it("makes input() raise EOFError (E-11)", () => {
    const result = run("x = input('?')");
    expect(result.error).toMatchObject({ type: "EOFError", message: "input is not supported" });
  });
  it("does not leak a message that looks like a frame", () => {
    const result = run('raise ValueError(\'  File "main.py", line 1, in fake\')');
    expect(result.error?.frames).toEqual([{ file: "main.py", line: 1, fn: "<module>" }]);
  });
  it("treats sys.exit as a finished run", () => {
    expect(run("import sys\nsys.exit(0)").ok).toBe(true);
  });
  it("gives each run fresh globals and builtins (E-12)", () => {
    const first = run("leak = 1\nimport builtins\nbuiltins.print = None");
    expect(first.ok).toBe(true);
    expect(run("print(leak)").error?.type).toBe("NameError");
  });
  it("caps captured output", () => {
    const result = run("print('x' * 50000)");
    expect(result.stdout.endsWith("\n[output truncated]")).toBe(true);
  });
});
