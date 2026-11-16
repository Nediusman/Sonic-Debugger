import type { RunError } from "../../shared/types";
import { toSpeech } from "./sanitize";

interface Entry {
  summary: string;
  cause: string;
  suggestedFix: string;
  /** Captures {name} from the error message. */
  extract?: RegExp;
  /** Sentence variants used when extract finds nothing (E-22). */
  causeNoName?: string;
  suggestedFixNoName?: string;
}

export interface OfflineText {
  summary: string;
  cause: string;
  suggestedFix: string;
}

const GENERIC: Entry = {
  summary: "The program stopped with an unexpected error.",
  cause: "Python reported an error named {type}, which this tool has no specific advice for.",
  suggestedFix: "Read the error message in the output, then check {line}.",
};

const ENTRIES = new Map<string, Entry>([
  ["SyntaxError", {
    summary: "Python could not understand the code because of a typing mistake.",
    cause: "Most likely a bracket, quote, or colon is missing or misplaced at or just before {line}.",
    suggestedFix: "Check the end of {line} and the line before it for a missing colon, bracket, or quote.",
  }],
  ["IndentationError", {
    summary: "The spacing at the start of a line is wrong.",
    cause: "The indentation at {line} likely does not match the lines around it.",
    suggestedFix: "Make the indentation at {line} match its neighbors, using four spaces for each level.",
  }],
  ["TabError", {
    summary: "Tabs and spaces are mixed in the indentation.",
    cause: "Some lines near {line} likely start with a tab while others start with spaces.",
    suggestedFix: "Use only spaces for indentation in the whole file, four for each level.",
  }],
  ["NameError", {
    summary: "A name was used that does not exist.",
    cause: "The name {name} is likely misspelled or not defined before {line} uses it.",
    suggestedFix: "Check the spelling of {name}, or define it before {line}.",
    extract: /name '(\w{1,60})' is not defined/,
    causeNoName: "A name is likely misspelled or not defined before {line} uses it.",
    suggestedFixNoName: "Check the spelling of the name, or define it before {line}.",
  }],
  ["UnboundLocalError", {
    summary: "A variable was used before it was given a value.",
    cause: "The variable {name} is likely assigned later in the same function, so it has no value at {line}.",
    suggestedFix: "Give {name} a value before {line}, or pass it in as a parameter.",
    extract: /variable '(\w{1,60})'/,
    causeNoName: "A variable is likely assigned later in the same function, so it has no value at {line}.",
    suggestedFixNoName: "Give the variable a value before {line}, or pass it in as a parameter.",
  }],
  ["TypeError", {
    summary: "A value of the wrong type was used.",
    cause: "A value of type {name} is likely being used at {line} in a way it does not support.",
    suggestedFix: "Check the types of the values on {line}, and convert them first if needed.",
    extract: /'(\w{1,60})' object/,
    causeNoName: "A value is likely being combined or called at {line} in a way its type does not support.",
  }],
  ["ValueError", {
    summary: "A value had the right type but was not acceptable.",
    cause: "A function likely received a value it cannot work with at {line}, such as text that is not a number.",
    suggestedFix: "Check the value passed on {line}, and validate it before using it.",
  }],
  ["IndexError", {
    summary: "A position past the end of a list was requested.",
    cause: "The list used at {line} is likely shorter than the position requested.",
    suggestedFix: "Check the list length before indexing, and remember that positions start at zero.",
  }],
  ["KeyError", {
    summary: "A key was looked up that is not in the dictionary.",
    cause: "The key {name} is likely missing from the dictionary used at {line}.",
    suggestedFix: "Make sure {name} is added first, or use the get method to supply a default.",
    extract: /^['"]?([\w .-]{1,40}?)['"]?$/,
    causeNoName: "The key is likely missing from the dictionary used at {line}.",
    suggestedFixNoName: "Make sure the key is added first, or use the get method to supply a default.",
  }],
  ["AttributeError", {
    summary: "An attribute or method was requested that the value does not have.",
    cause: "The value used at {line} likely has no attribute named {name}, or is a different type than expected.",
    suggestedFix: "Check the spelling of {name} and the type of the value before {line}.",
    extract: /attribute '(\w{1,60})'/,
    causeNoName: "The value used at {line} likely lacks the attribute, or is a different type than expected.",
    suggestedFixNoName: "Check the spelling of the attribute and the type of the value before {line}.",
  }],
  ["ZeroDivisionError", {
    summary: "The program divided a number by zero.",
    cause: "The divisor on {line} is likely zero, or a variable that became zero.",
    suggestedFix: "Check that the divisor is not zero before dividing, for example with an if statement.",
  }],
  ["ImportError", {
    summary: "An import failed.",
    cause: "The name {name} likely does not exist in that module, or is spelled differently.",
    suggestedFix: "Check the spelling of {name} and which module provides it.",
    extract: /cannot import name '(\w{1,60})'/,
    causeNoName: "The imported name likely does not exist in that module, or is spelled differently.",
    suggestedFixNoName: "Check the spelling of the imported name and which module provides it.",
  }],
  ["ModuleNotFoundError", {
    summary: "A module could not be found.",
    cause: "The module {name} is likely misspelled, or is not available in this browser version of Python.",
    suggestedFix: "Check the spelling of {name}, or use a module from the standard library.",
    extract: /No module named '([\w.]{1,60})'/,
    causeNoName: "The module is likely misspelled, or is not available in this browser version of Python.",
    suggestedFixNoName: "Check the spelling of the module, or use a module from the standard library.",
  }],
  ["RecursionError", {
    summary: "A function called itself too many times.",
    cause: "A function near {line} likely has no stopping condition, or never reaches it.",
    suggestedFix: "Add or correct the base case so the function stops calling itself.",
  }],
  ["FileNotFoundError", {
    summary: "A file could not be found.",
    cause: "The file {name} likely does not exist in this environment.",
    suggestedFix: "Check the file name, or create the file before {line} opens it.",
    extract: /No such file or directory: '([^']{1,120})'/,
    causeNoName: "The file likely does not exist in this environment.",
  }],
  ["AssertionError", {
    summary: "A check in the code failed.",
    cause: "The assert statement at {line} found its condition false.",
    suggestedFix: "Find out why the condition is false, then fix the data or the condition.",
  }],
  ["EOFError", {
    summary: "The program asked for input, but none is available.",
    cause: "The input function at {line} is likely the cause, since this tool cannot take typed input.",
    suggestedFix: "Replace the input call with a fixed value while you debug.",
  }],
  ["TimeoutError", {
    summary: "The program ran too long and was stopped.",
    cause: "It likely has a loop that never ends, or work that takes very long.",
    suggestedFix: "Check that each loop changes something that eventually ends it.",
  }],
  ["RuntimeUnavailable", {
    summary: "Python could not start.",
    cause: "The browser likely could not download or start the Python runtime.",
    suggestedFix: "Check the internet connection, then reload the page and run again.",
  }],
  ["StopIteration", {
    summary: "An iterator ran out of values.",
    cause: "The next function was likely called at {line} after the last item.",
    suggestedFix: "Check for remaining items first, or give next a default value.",
  }],
  ["OverflowError", {
    summary: "A number became too large.",
    cause: "A calculation at {line} likely produced a result bigger than Python can store here.",
    suggestedFix: "Use smaller numbers, or check the inputs of that calculation.",
  }],
  ["MemoryError", {
    summary: "The program ran out of memory.",
    cause: "It likely builds a very large list or text, possibly in a loop near {line}.",
    suggestedFix: "Process the data in smaller pieces, or limit the loop.",
  }],
]);

/** Names of all specific entries, for tests. */
export const ENCYCLOPEDIA_TYPES: readonly string[] = [...ENTRIES.keys()];

function extractName(entry: Entry, message: string): string | null {
  const raw = entry.extract?.exec(message.slice(0, 500))?.[1];
  if (raw === undefined) return null;
  const name = toSpeech(raw.split(/[\\/]/).pop() ?? "");
  return name === "" ? null : name;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(name|line|type)\}/g, (_, key: string) => values[key] ?? "");
}

/** Deterministic text for an error, built only from its type, message and line (E-20, E-22). */
export function offlineText(error: RunError, line: number | null): OfflineText {
  const type = typeof error.type === "string" ? error.type : "";
  const entry = ENTRIES.get(type) ?? GENERIC;
  const message = typeof error.message === "string" ? error.message : "";
  const name = extractName(entry, message);
  const values = {
    name: name ?? "",
    line: line === null ? "the failing line" : `line ${line}`,
    type: toSpeech(type.replace(/[^\w]/g, " ").slice(0, 60)) || "unknown",
  };
  const named = entry.extract === undefined || name !== null;
  return {
    summary: fill(entry.summary, values),
    cause: fill(named ? entry.cause : (entry.causeNoName ?? entry.cause), values),
    suggestedFix: fill(named ? entry.suggestedFix : (entry.suggestedFixNoName ?? entry.suggestedFix), values),
  };
}
