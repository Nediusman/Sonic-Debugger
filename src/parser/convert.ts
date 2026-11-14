import type { Node } from "web-tree-sitter";
import type { CodeTree, NodeKind, ParseIssue, TreeNode } from "../shared/types";
import { issueFor } from "./issues";
import { cleanName } from "./text";

type Context = "class-block" | "class-body" | "other";

interface Frame {
  node: Node;
  parentId: string;
  context: Context;
}

interface Classified {
  kind: NodeKind;
  name?: string;
  parameterCount?: number;
}

const PARAMETER_SKIP = new Set(["comment", "positional_separator", "keyword_separator"]);
const OTHER_KEYWORDS: Record<string, string> = {
  with_statement: "with",
  match_statement: "match",
  raise_statement: "raise",
  assert_statement: "assert",
};
const LEAF_TYPES = new Set([
  "expression_statement",
  "return_statement",
  "import_statement",
  "import_from_statement",
  "raise_statement",
  "assert_statement",
]);

export const ROOT_ID = nodeId(0);

export function nodeId(index: number): string {
  return `n${String(index).padStart(5, "0")}`;
}

function field(node: Node, name: string): string | undefined {
  return node.childForFieldName(name)?.text;
}

function parameterCount(node: Node): number {
  const params = node.childForFieldName("parameters");
  if (!params) return 0;
  return params.namedChildren.filter((c) => !PARAMETER_SKIP.has(c.type)).length;
}

function importName(node: Node): string | undefined {
  if (node.type === "import_from_statement") return field(node, "module_name");
  const first = node.childForFieldName("name");
  return first?.type === "aliased_import" ? field(first, "name") : first?.text;
}

function classifyStatement(node: Node): Classified | null {
  const inner = node.namedChildren.filter((c) => c.type !== "comment");
  const only = inner.length === 1 ? inner[0] : undefined;
  if (only?.type === "call") return { kind: "call", name: field(only, "function") };
  if (only?.type === "assignment" || only?.type === "augmented_assignment") {
    const left = only.childForFieldName("left");
    return { kind: "assignment", name: left?.type === "identifier" ? left.text : undefined };
  }
  return null;
}

function classify(node: Node, context: Context): Classified | null {
  switch (node.type) {
    case "module":
      return { kind: "module" };
    case "class_definition":
      return { kind: "class", name: field(node, "name") };
    case "function_definition":
      return {
        kind: context === "class-body" ? "method" : "function",
        name: field(node, "name"),
        parameterCount: parameterCount(node),
      };
    case "for_statement":
    case "while_statement":
      return { kind: "loop" };
    case "if_statement":
      return { kind: "conditional", name: "if" };
    case "elif_clause":
      return { kind: "conditional", name: "elif" };
    case "else_clause":
      return node.parent?.type === "if_statement" ? { kind: "conditional", name: "else" } : null;
    case "try_statement":
      return { kind: "try" };
    case "expression_statement":
      return classifyStatement(node);
    case "return_statement":
      return { kind: "return" };
    case "import_statement":
    case "import_from_statement":
      return { kind: "import", name: importName(node) };
    default:
      return node.type in OTHER_KEYWORDS ? { kind: "other", name: OTHER_KEYWORDS[node.type] } : null;
  }
}

function childContext(parent: Node, child: Node, context: Context): Context {
  if (parent.type === "class_definition") return child.type === "block" ? "class-block" : "other";
  if (parent.type === "block" && context === "class-block") return "class-body";
  if (parent.type === "decorated_definition") return context;
  return "other";
}

function range(node: Node, lines: string[]): Pick<TreeNode, "startLine" | "endLine" | "startCol" | "endCol"> {
  const start = node.startPosition;
  const end = node.endPosition;
  const endsAtLineStart = end.column === 0 && end.row > start.row;
  const endRow = endsAtLineStart ? end.row - 1 : end.row;
  const clampedRow = Math.min(endRow, lines.length - 1);
  return {
    startLine: start.row + 1,
    startCol: start.column,
    endLine: clampedRow + 1,
    endCol: endsAtLineStart ? (lines[clampedRow] ?? "").length : end.column,
  };
}

function rootNode(lines: string[]): TreeNode {
  return {
    id: ROOT_ID,
    kind: "module",
    depth: 0,
    startLine: 1,
    endLine: lines.length,
    startCol: 0,
    endCol: (lines[lines.length - 1] ?? "").length,
    parentId: null,
    childIds: [],
  };
}

export function emptyTree(source: string, issues: ParseIssue[]): CodeTree {
  return { rootId: ROOT_ID, nodes: { [ROOT_ID]: rootNode(source.split("\n")) }, issues };
}

function createNode(
  classified: Classified,
  node: Node,
  parent: TreeNode,
  id: string,
  lines: string[],
): TreeNode {
  const name = classified.name === undefined ? undefined : cleanName(classified.name);
  return {
    id,
    kind: classified.kind,
    ...(name === undefined ? {} : { name }),
    depth: parent.depth + 1,
    ...range(node, lines),
    parentId: parent.id,
    childIds: [],
    ...(classified.parameterCount === undefined ? {} : { parameterCount: classified.parameterCount }),
  };
}

/** Walks the syntax tree once, iteratively so deep nesting cannot overflow the stack. */
export function convert(root: Node, source: string): CodeTree {
  const lines = source.split("\n");
  const nodes: Record<string, TreeNode> = { [ROOT_ID]: rootNode(lines) };
  const issues: ParseIssue[] = [];
  const seen = new Set<string>();
  let count = 1;
  const stack: Frame[] = [];
  const hasErrors = root.hasError;
  const expand = (node: Node, parentId: string, context: Context): void => {
    if (LEAF_TYPES.has(node.type) && !(hasErrors && node.hasError)) return;
    const children = node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      stack.push({ node: child, parentId, context: childContext(node, child, context) });
    }
  };
  expand(root, ROOT_ID, "other");
  while (stack.length > 0) {
    const { node, parentId, context } = stack.pop() as Frame;
    const issue = hasErrors ? issueFor(node, lines) : null;
    const key = issue ? `${issue.line}:${issue.column}:${issue.message}` : "";
    if (issue && !seen.has(key)) {
      seen.add(key);
      issues.push(issue);
    }
    const classified = classify(node, context);
    let nextParent = parentId;
    if (classified) {
      const parent = nodes[parentId];
      const created = createNode(classified, node, parent, nodeId(count++), lines);
      nodes[created.id] = created;
      parent.childIds.push(created.id);
      nextParent = created.id;
    }
    expand(node, nextParent, context);
  }
  return { rootId: ROOT_ID, nodes, issues };
}
