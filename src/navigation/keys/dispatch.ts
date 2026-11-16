import { keyToCommand } from "./keyToCommand";
import type { KeyCommand, KeyLike } from "./types";

export interface KeyEventLike extends KeyLike {
  preventDefault(): void;
}

function allowedOnRepeat(command: KeyCommand): boolean {
  return command.kind === "nav" && (command.intent === "next" || command.intent === "previous");
}

/**
 * Handle a key press. `inTree` is true only when DOM focus is on a treeitem.
 * Mapped keys call preventDefault; others are left alone. Held keys repeat
 * only for Up and Down.
 */
export function dispatchKey(
  event: KeyEventLike,
  inTree: boolean,
  run: (command: KeyCommand) => void,
): boolean {
  if (!inTree) return false;
  const command = keyToCommand(event);
  if (!command) return false;
  event.preventDefault();
  if (!event.repeat || allowedOnRepeat(command)) run(command);
  return true;
}
