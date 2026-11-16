import type { RunFrame, RunResult } from "../../shared/types";
import { SOURCE_12 } from "./trees";

export function failingRun(type: string, message: string, frames: RunFrame[], source: string = SOURCE_12): RunResult {
  return { ok: false, source, stdout: "", error: { type, message, frames } };
}

export const frame = (line: number, fn: string): RunFrame => ({ file: "main.py", line, fn });

/** One realistic message per encyclopedia type. */
export const REALISTIC: Record<string, string> = {
  SyntaxError: "invalid syntax",
  IndentationError: "unexpected indent",
  TabError: "inconsistent use of tabs and spaces in indentation",
  NameError: "name 'total' is not defined",
  UnboundLocalError: "cannot access local variable 'count' where it is not associated with a value",
  TypeError: "'int' object is not subscriptable",
  ValueError: "invalid literal for int() with base 10: 'abc'",
  IndexError: "list index out of range",
  KeyError: "'apple'",
  AttributeError: "'str' object has no attribute 'push'",
  ZeroDivisionError: "division by zero",
  ImportError: "cannot import name 'sqroot' from 'math'",
  ModuleNotFoundError: "No module named 'numpyy'",
  RecursionError: "maximum recursion depth exceeded",
  FileNotFoundError: "[Errno 44] No such file or directory: '/home/user/data/input.csv'",
  AssertionError: "",
  EOFError: "input is not supported",
  TimeoutError: "The program ran for more than 10 seconds and was stopped",
  RuntimeUnavailable: "Python could not start in this browser",
  StopIteration: "",
  OverflowError: "int too large to convert to float",
  MemoryError: "",
};
