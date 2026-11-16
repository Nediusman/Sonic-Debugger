import type { FocusPosition } from "../../shared/types";

export interface TreeItemProps {
  id: string;
  role: "treeitem";
  "aria-level": number;
  "aria-setsize": number;
  "aria-posinset": number;
  "aria-expanded"?: boolean;
  tabIndex: 0 | -1;
}

export function treeItemId(nodeId: string): string {
  return `ti-${nodeId}`;
}

/** ARIA attributes for one treeitem. `expanded` is undefined for leaves. */
export function getTreeItemProps(
  position: FocusPosition,
  focused: boolean,
  expanded?: boolean,
): TreeItemProps {
  const props: TreeItemProps = {
    id: treeItemId(position.nodeId),
    role: "treeitem",
    "aria-level": position.level,
    "aria-setsize": position.total,
    "aria-posinset": position.index,
    tabIndex: focused ? 0 : -1,
  };
  if (expanded !== undefined) props["aria-expanded"] = expanded;
  return props;
}

/** Move DOM focus to a treeitem and scroll it into view. Returns false if it is not rendered. */
export function focusTreeItem(root: ParentNode, nodeId: string): boolean {
  const element = root.querySelector<HTMLElement>(`[id="${treeItemId(nodeId)}"]`);
  if (!element) return false;
  element.focus();
  element.scrollIntoView?.({ block: "nearest" });
  return true;
}
