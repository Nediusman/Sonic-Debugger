import fc from "fast-check";
import type { CodeTree, NavAction, NavState, TreeNode } from "../../shared/types";
import type { KeyLike } from "../keys/types";
import { KEY_MAP, RESERVED_CODES } from "../keys/keymap";
import { visibleNodeIds } from "../model/visible";
import { hasChildren } from "../model/tree";

interface Seed {
  parents: number[];
  extra: number[];
}

/** parents[i] is the parent index (< i + 1) of node i + 1; extra[i] pads node i's line range. */
function buildTree({ parents, extra }: Seed): CodeTree {
  const count = parents.length + 1;
  const kids: number[][] = Array.from({ length: count }, () => []);
  parents.forEach((p, i) => kids[p % (i + 1)].push(i + 1));
  const nodes: Record<string, TreeNode> = {};
  const layout = (i: number, depth: number, parentId: string | null, start: number): number => {
    const id = `n${i}`;
    let end = start + (extra[i] ?? 0);
    let cursor = start;
    for (const child of kids[i]) {
      const childEnd = layout(child, depth + 1, id, cursor);
      end = Math.max(end, childEnd);
      cursor = childEnd + 1;
    }
    nodes[id] = {
      id, kind: i === 0 ? "module" : kids[i].length > 0 ? "function" : "call",
      name: i === 0 ? undefined : `item${i}`, depth, startLine: start, endLine: end,
      startCol: 0, endCol: 0, parentId, childIds: kids[i].map((c) => `n${c}`), parameterCount: 0,
    };
    return end;
  };
  layout(0, 0, null, 1);
  return { rootId: "n0", nodes, issues: [] };
}

export const treeArb: fc.Arbitrary<CodeTree> = fc
  .integer({ min: 0, max: 24 })
  .chain((n) =>
    fc.record({
      parents: fc.array(fc.nat({ max: 1000 }), { minLength: n, maxLength: n }),
      extra: fc.array(fc.nat({ max: 2 }), { minLength: n + 1, maxLength: n + 1 }),
    }),
  )
  .map(buildTree);

export interface StateSeed {
  expandMask: boolean[];
  focusPick: number;
  errorPick: number | null;
}

export function stateFrom(tree: CodeTree, seed: StateSeed): NavState {
  const ids = Object.keys(tree.nodes);
  const expandedIds = ids.filter((id, i) => hasChildren(tree, id) && seed.expandMask[i % seed.expandMask.length]).sort();
  const base: NavState = { focusId: tree.rootId, expandedIds, errorNodeId: null };
  const visible = visibleNodeIds(tree, base);
  return {
    ...base,
    focusId: visible[seed.focusPick % visible.length],
    errorNodeId: seed.errorPick === null ? null : ids[seed.errorPick % ids.length],
  };
}

export const stateSeedArb: fc.Arbitrary<StateSeed> = fc.record({
  expandMask: fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
  focusPick: fc.nat({ max: 1000 }),
  errorPick: fc.option(fc.nat({ max: 1000 }), { nil: null }),
});

export const treeAndStateArb: fc.Arbitrary<{ tree: CodeTree; state: NavState }> = fc
  .tuple(treeArb, stateSeedArb)
  .map(([tree, seed]) => ({ tree, state: stateFrom(tree, seed) }));

const simpleTypes = ["next", "previous", "expand", "collapse", "parentNode", "firstChildNode", "first", "last", "goToError"] as const;

export const actionArb: fc.Arbitrary<NavAction> = fc.oneof(
  fc.constantFrom(...simpleTypes).map((type) => ({ type }) as NavAction),
  fc.oneof(fc.integer({ min: -3, max: 80 }), fc.constantFrom(NaN, 1.5, Infinity)).map((line) => ({ type: "goToLine", line }) as NavAction),
);

const knownCodes = [...Object.keys(KEY_MAP), ...RESERVED_CODES, "Escape", "Slash", "Tab", "Space", "KeyA", "KeyZ", "Digit1", "ArrowDown"];

export const codeArb: fc.Arbitrary<string> = fc.oneof(fc.constantFrom(...knownCodes), fc.string({ maxLength: 8 }));

export const keyArb: fc.Arbitrary<KeyLike> = fc.record({
  code: codeArb,
  ctrlKey: fc.boolean(),
  altKey: fc.boolean(),
  metaKey: fc.boolean(),
  shiftKey: fc.boolean(),
  repeat: fc.boolean(),
});
