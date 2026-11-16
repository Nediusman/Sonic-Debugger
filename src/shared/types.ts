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
/** Sonification additions (spec Q-S8, A-S5). */
export type Timbre =
  | "module" | "class" | "function" | "method" | "loop" | "conditional"
  | "try" | "call" | "assignment" | "return" | "import" | "other"
  | "error-sine" | "error-saw";
export interface SoundEvent {
  nodeId: string;
  startOffsetMs: number;
  durationMs: number;
  frequencyHz: number;
  timbre: Timbre;
  /** 0 < gain <= 0.4 */
  gain: number;
  /** -0.8 .. 0.8 */
  stereoPan: number;
}
export interface SonifyOptions {
  reducedSound?: boolean;
}
/** Navigation additions (navigation-a11y-spec N-T1, Q-N3). */
export interface FocusPosition {
  nodeId: string;
  /** 1-based among siblings. */
  index: number;
  /** Sibling count. */
  total: number;
  /** depth + 1. */
  level: number;
}
export type NavAction =
  | { type: "next" }
  | { type: "previous" }
  | { type: "expand" }
  | { type: "collapse" }
  | { type: "parentNode" }
  | { type: "firstChildNode" }
  | { type: "first" }
  | { type: "last" }
  | { type: "goToLine"; line: number }
  | { type: "goToError" };
export interface NavState {
  focusId: string;
  /** Sorted ascending; only nodes with children. */
  expandedIds: string[];
  errorNodeId: string | null;
}
export interface NavResult {
  state: NavState;
  position: FocusPosition;
  message: string;
  moved: boolean;
}
export interface RunFrame {
  file: string;
  line: number;
  fn: string;
}
export interface RunError {
  type: string;
  message: string;
  frames: RunFrame[];
}
export interface RunResult {
  ok: boolean;
  source: string;
  stdout: string;
  error?: RunError;
}
export interface NarrationResult {
  summary: string;
  location: string;
  cause: string;
  suggestedFix: string;
  nodeId: string;
  offline: boolean;
}
