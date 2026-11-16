import type { CodeTree, NavAction, NavState } from "../../shared/types";
import { hasChildren } from "../model/tree";
import type { NavIntent } from "./types";

export function intentToAction(tree: CodeTree, state: NavState, intent: NavIntent): NavAction {
  const id = state.focusId;
  const open = state.expandedIds.includes(id) && hasChildren(tree, id);
  switch (intent) {
    case "expandOrDescend":
      return hasChildren(tree, id) && !open ? { type: "expand" } : { type: "firstChildNode" };
    case "collapseOrAscend":
      return open ? { type: "collapse" } : { type: "parentNode" };
    default:
      return { type: intent };
  }
}
