import type { Node } from "web-tree-sitter";
import type { ParseIssue } from "../shared/types";

const MISSING_TOKENS: Record<string, string> = {
  ":": "a colon",
  ")": "a closing parenthesis",
  "]": "a closing square bracket",
  "}": "a closing curly bracket",
  '"': "a closing quote",
  "'": "a closing quote",
  ",": "a comma",
  "=": "an equals sign",
  identifier: "a name",
  indent: "an indented line",
  dedent: "the end of an indented block",
};

export function issueFor(node: Node, lines: string[]): ParseIssue | null {
  if (!node.isError && !node.isMissing) return null;
  const row = Math.min(node.startPosition.row, lines.length - 1);
  const line = lines[row] ?? "";
  return {
    line: row + 1,
    column: Math.min(node.startPosition.column, line.length),
    message: node.isMissing ? missingMessage(node.type) : "This code is not valid Python.",
  };
}

function missingMessage(type: string): string {
  const what = MISSING_TOKENS[type];
  return what ? `Something is missing here: ${what}.` : "Something is missing here.";
}
