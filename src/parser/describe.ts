import type { CodeTree, TreeNode } from "../shared/types";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function withName(label: string, node: TreeNode): string {
  return node.name ? `${label} ${node.name}` : label;
}

function conditionalLabel(node: TreeNode): string {
  return node.name === "elif" ? "else if" : node.name === "else" ? "else" : "if";
}

function methodCount(tree: CodeTree, node: TreeNode): number {
  return node.childIds.filter((id) => tree.nodes[id]?.kind === "method").length;
}

function describeParts(tree: CodeTree, node: TreeNode, lines: string): string {
  const params = plural(node.parameterCount ?? 0, "parameter");
  switch (node.kind) {
    case "module":
      return `module, ${lines}`;
    case "class":
      return `${withName("class", node)}, ${plural(methodCount(tree, node), "method")}, ${lines}`;
    case "function":
    case "method":
      return `${withName(node.kind, node)}, ${params}, ${lines}`;
    case "loop":
      return `loop, ${lines}`;
    case "conditional":
      return `${conditionalLabel(node)}, ${lines}`;
    case "try":
      return `try block, ${lines}`;
    case "call":
      return withName("call", node);
    case "assignment":
      return `${node.name ? `assignment to ${node.name}` : "assignment"}, line ${node.startLine}`;
    case "return":
      return `return, line ${node.startLine}`;
    case "import":
      return withName("import", node);
    case "other":
      return `${node.name ?? "other"} statement, ${lines}`;
  }
}

export function describeNode(tree: CodeTree, node: TreeNode): string {
  const lines = plural(node.endLine - node.startLine + 1, "line");
  return describeParts(tree, node, lines);
}
