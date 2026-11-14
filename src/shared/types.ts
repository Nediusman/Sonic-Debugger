export type NodeKind =
  | "module"
  | "class"
  | "function"
  | "method"
  | "loop"
  | "conditional"
  | "try"
  | "call"
  | "assignment"
  | "return"
  | "import"
  | "other";

export interface TreeNode {
  id: string;
  kind: NodeKind;
  name?: string;
  depth: number;
  /** 1-based. */
  startLine: number;
  /** 1-based, inclusive. */
  endLine: number;
  /** 0-based. */
  startCol: number;
  /** 0-based. */
  endCol: number;
  parentId: string | null;
  childIds: string[];
  /** Function and method nodes only. Pending contracts.md change (Q-P1). */
  parameterCount?: number;
}

export interface ParseIssue {
  line: number;
  column: number;
  message: string;
}

export interface CodeTree {
  rootId: string;
  nodes: Record<string, TreeNode>;
  issues: ParseIssue[];
}
