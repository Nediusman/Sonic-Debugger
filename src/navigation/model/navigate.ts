import { firstChild, nodeAtLine, parent } from "../../parser";
import type { CodeTree, NavAction, NavResult, NavState } from "../../shared/types";
import { announce } from "../announce";
import { withAncestorsExpanded } from "./state";
import { hasChildren, positionOf } from "./tree";
import { visibleNodeIds } from "./visible";

export const MESSAGES = {
  end: "End of structure",
  start: "Start of structure",
  top: "Top of structure",
  alreadyExpanded: "Already expanded",
  alreadyCollapsed: "Already collapsed",
  collapsed: "Collapsed",
  empty: "No items inside",
  noError: "No error to go to. Run the code first.",
  notWhole: "Enter a whole line number",
} as const;

type Handler = (tree: CodeTree, state: NavState, visible: string[]) => Outcome;
interface Outcome {
  state: NavState;
  /** Set when the action ends with a message other than an announcement. */
  message?: string;
}

const stay = (state: NavState, message: string): Outcome => ({ state, message });
const focusOn = (state: NavState, focusId: string): Outcome => ({ state: { ...state, focusId } });

function neighbour(state: NavState, visible: string[], step: 1 | -1): Outcome {
  const target = visible[visible.indexOf(state.focusId) + step];
  if (target !== undefined) return focusOn(state, target);
  return stay(state, step === 1 ? MESSAGES.end : MESSAGES.start);
}

function expandOne(tree: CodeTree, state: NavState): Outcome {
  const id = state.focusId;
  const count = tree.nodes[id].childIds.length;
  if (!hasChildren(tree, id)) return stay(state, MESSAGES.empty);
  if (state.expandedIds.includes(id)) return stay(state, MESSAGES.alreadyExpanded);
  const expandedIds = [...state.expandedIds, id].sort();
  return stay({ ...state, expandedIds }, `Expanded, ${count} ${count === 1 ? "item" : "items"}`);
}

function collapseOne(state: NavState): Outcome {
  if (!state.expandedIds.includes(state.focusId)) return stay(state, MESSAGES.alreadyCollapsed);
  const expandedIds = state.expandedIds.filter((id) => id !== state.focusId);
  return stay({ ...state, expandedIds }, MESSAGES.collapsed);
}

function toParent(tree: CodeTree, state: NavState): Outcome {
  const owner = parent(tree, state.focusId);
  return owner ? focusOn(state, owner.id) : stay(state, MESSAGES.top);
}

function toFirstChild(tree: CodeTree, state: NavState): Outcome {
  const child = firstChild(tree, state.focusId);
  if (!child) return stay(state, MESSAGES.empty);
  const expandedIds = state.expandedIds.includes(state.focusId)
    ? state.expandedIds
    : [...state.expandedIds, state.focusId].sort();
  return focusOn({ ...state, expandedIds }, child.id);
}

function reveal(tree: CodeTree, state: NavState, id: string): Outcome {
  const expandedIds = withAncestorsExpanded(tree, state.expandedIds, id);
  return focusOn({ ...state, expandedIds }, id);
}

function toLine(tree: CodeTree, state: NavState, line: number): Outcome {
  if (!Number.isInteger(line)) return stay(state, MESSAGES.notWhole);
  const lineCount = tree.nodes[tree.rootId].endLine;
  const target = line >= 1 && line <= lineCount ? nodeAtLine(tree, line) : null;
  if (!target) return stay(state, `Line ${line} is outside the file, which has ${lineCount} lines`);
  return reveal(tree, state, target.id);
}

function toError(tree: CodeTree, state: NavState): Outcome {
  const id = state.errorNodeId;
  if (id === null || !Object.hasOwn(tree.nodes, id)) return stay(state, MESSAGES.noError);
  return reveal(tree, state, id);
}

function run(tree: CodeTree, state: NavState, visible: string[], action: NavAction): Outcome {
  const handlers: Record<Exclude<NavAction["type"], "goToLine">, Handler> = {
    next: () => neighbour(state, visible, 1),
    previous: () => neighbour(state, visible, -1),
    first: () => focusOn(state, visible[0]),
    last: () => focusOn(state, visible[visible.length - 1]),
    expand: () => expandOne(tree, state),
    collapse: () => collapseOne(state),
    parentNode: () => toParent(tree, state),
    firstChildNode: () => toFirstChild(tree, state),
    goToError: () => toError(tree, state),
  };
  return action.type === "goToLine" ? toLine(tree, state, action.line) : handlers[action.type](tree, state, visible);
}

/** Drop invalid ids so every action starts from a valid state. */
function sanitize(tree: CodeTree, state: NavState): NavState {
  const expandedIds = [...new Set(state.expandedIds)]
    .filter((id) => Object.hasOwn(tree.nodes, id) && hasChildren(tree, id))
    .sort();
  const focusOk = Object.hasOwn(tree.nodes, state.focusId);
  const base = { ...state, expandedIds, focusId: focusOk ? state.focusId : tree.rootId };
  return visibleNodeIds(tree, base).includes(base.focusId) ? base : { ...base, focusId: tree.rootId };
}

export function navigate(tree: CodeTree, state: NavState, action: NavAction): NavResult {
  const start = sanitize(tree, state);
  const outcome = run(tree, start, visibleNodeIds(tree, start), action);
  const position = positionOf(tree, outcome.state.focusId);
  const moved = outcome.state.focusId !== state.focusId;
  return { state: outcome.state, position, message: outcome.message ?? announce(position, tree), moved };
}

