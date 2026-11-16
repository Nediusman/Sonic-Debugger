import { describeNode } from "../parser";
import type { CodeTree, FocusPosition } from "../shared/types";

const BANNED = /[`*#<>{}[\]|\\\r\n]+/g;

/** Speech-ready name of a focused node: description, then place among siblings. */
export function announce(position: FocusPosition, tree: CodeTree): string {
  const node = Object.hasOwn(tree.nodes, position.nodeId) ? tree.nodes[position.nodeId] : null;
  const text = node ? describeNode(tree, node) : "unknown item";
  const full = `${text}, item ${position.index} of ${position.total}, level ${position.level}`;
  return full.replace(BANNED, " ").replace(/ {2,}/g, " ").trim();
}
