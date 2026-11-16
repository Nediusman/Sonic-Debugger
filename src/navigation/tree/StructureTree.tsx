import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { describeNode } from "../../parser";
import type { CodeTree, NavState } from "../../shared/types";
import { announce } from "../announce";
import { dispatchKey } from "../keys/dispatch";
import type { KeyCommand } from "../keys/types";
import { childIdsOf, hasChildren, positionOf } from "../model/tree";
import { focusTreeItem, getTreeItemProps } from "./aria";
import "./StructureTree.css";

export interface StructureTreeProps {
  tree: CodeTree;
  state: NavState;
  onKeyCommand(command: KeyCommand, event: KeyboardEvent): void;
  /** DOM focus reached an item (click or Tab in). */
  onItemFocus(nodeId: string): void;
}

interface ItemProps {
  tree: CodeTree;
  state: NavState;
  nodeId: string;
  expanded: ReadonlySet<string>;
  onItemFocus(nodeId: string): void;
}

function Item({ tree, state, nodeId, expanded, onItemFocus }: ItemProps): ReactElement {
  const node = tree.nodes[nodeId];
  const position = positionOf(tree, nodeId);
  const parentOfChildren = hasChildren(tree, nodeId);
  const open = parentOfChildren && expanded.has(nodeId);
  const isError = state.errorNodeId === nodeId;
  const aria = getTreeItemProps(position, state.focusId === nodeId, parentOfChildren ? open : undefined);
  return (
    <li
      {...aria}
      aria-label={announce(position, tree)}
      aria-describedby={isError ? `${aria.id}-error` : undefined}
      onFocus={(event) => {
        if (event.target === event.currentTarget) onItemFocus(nodeId);
      }}
    >
      <span className="tree-label">{describeNode(tree, node)}</span>
      {isError ? (
        <span className="tree-error" id={`${aria.id}-error`}>
          Error here
        </span>
      ) : null}
      {open ? (
        <ul role="group">
          {childIdsOf(tree, nodeId).map((id) => (
            <Item key={id} tree={tree} state={state} nodeId={id} expanded={expanded} onItemFocus={onItemFocus} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function isTreeItem(target: EventTarget): boolean {
  return (target as Element).getAttribute?.("role") === "treeitem";
}

export function StructureTree(props: StructureTreeProps): ReactElement {
  const { tree, state, onKeyCommand, onItemFocus } = props;
  const rootRef = useRef<HTMLUListElement>(null);
  const fromCommand = useRef(false);
  const expanded = new Set(state.expandedIds);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hadFocus = root.contains(document.activeElement);
    if (fromCommand.current || hadFocus) focusTreeItem(root, state.focusId);
    fromCommand.current = false;
  }, [state.focusId]);

  const handleKeyDown = (event: KeyboardEvent): void => {
    dispatchKey(event, isTreeItem(event.target), (command) => {
      fromCommand.current = true;
      onKeyCommand(command, event);
    });
  };

  return (
    <ul
      ref={rootRef}
      role="tree"
      aria-label="Code structure"
      className="structure-tree"
      onKeyDown={handleKeyDown}
    >
      <Item tree={tree} state={state} nodeId={tree.rootId} expanded={expanded} onItemFocus={onItemFocus} />
    </ul>
  );
}
