import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  describeNode, firstChild, nextSibling, nodeAtLine, parent, parse, previousSibling,
} from "./index";
import { anySource, program } from "./grammar";
import { sampleTree } from "./fixtures/trees";
import type { CodeTree, TreeNode } from "../shared/types";

const RUNS = { numRuns: 200 } as const;
const lineCount = (source: string): number => source.replace(/\r\n?/g, "\n").split("\n").length;
const nodesOf = (t: CodeTree): TreeNode[] => Object.values(t.nodes);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

describe("PR-1 parse always resolves with a root (P-1)", () => {
  it("any string", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const t = await parse(source);
        expect(t.nodes[t.rootId]?.kind).toBe("module");
      }),
      RUNS,
    );
  });

  it("a 1 MB string", async () => {
    const t = await parse("x = 1\n".repeat(170_000));
    expect(t.nodes[t.rootId].kind).toBe("module");
  }, 60_000);
});

describe("PR-2 generated valid programs have no issues (P-3)", () => {
  it("issues is empty", async () => {
    await fc.assert(
      fc.asyncProperty(program, async ({ source }) => {
        expect((await parse(source)).issues).toEqual([]);
      }),
      RUNS,
    );
  });
});

describe("PR-3 issues are in range and plain (P-5)", () => {
  it("line, column, message", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const lines = source.replace(/\r\n?/g, "\n").split("\n");
        for (const issue of (await parse(source)).issues) {
          expect(issue.line).toBeGreaterThanOrEqual(1);
          expect(issue.line).toBeLessThanOrEqual(lines.length);
          expect(issue.column).toBeGreaterThanOrEqual(0);
          expect(issue.column).toBeLessThanOrEqual(lines[issue.line - 1].length);
          expect(issue.message.length).toBeGreaterThan(0);
          expect(issue.message.length).toBeLessThanOrEqual(120);
          expect(issue.message).not.toMatch(/ERROR|MISSING/);
        }
      }),
      RUNS,
    );
  });
});

describe("PR-4 line endings (P-6)", () => {
  it("CRLF and CR equal LF", async () => {
    await fc.assert(
      fc.asyncProperty(program, fc.constantFrom("\r\n", "\r"), async ({ source }, eol) => {
        expect(await parse(source.replace(/\n/g, eol))).toEqual(await parse(source));
      }),
      RUNS,
    );
  });
});

describe("tree invariants on any string (P-7, P-8, P-9, P-11)", () => {
  it("PR-5 rooted tree", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const t = await parse(source);
        const root = t.nodes[t.rootId];
        expect(root).toMatchObject({ kind: "module", depth: 0, parentId: null });
        const visited: string[] = [];
        const walk = (id: string): void => {
          visited.push(id);
          t.nodes[id].childIds.forEach(walk);
        };
        walk(t.rootId);
        expect(new Set(visited).size).toBe(visited.length);
        expect([...visited].sort()).toEqual(Object.keys(t.nodes).sort());
      }),
      RUNS,
    );
  });

  it("PR-6 ids, parents, depth", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const t = await parse(source);
        for (const [id, node] of Object.entries(t.nodes)) {
          expect(node.id).toBe(id);
          for (const childId of node.childIds) {
            expect(t.nodes[childId].parentId).toBe(id);
            expect(t.nodes[childId].depth).toBe(node.depth + 1);
          }
        }
        expect(Object.keys(t.nodes)).toEqual(Object.keys(t.nodes).sort());
      }),
      RUNS,
    );
  });

  it("PR-7 ranges nest and children are in source order", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const t = await parse(source);
        const total = lineCount(source);
        for (const node of nodesOf(t)) {
          expect(node.startLine).toBeGreaterThanOrEqual(1);
          expect(node.startLine).toBeLessThanOrEqual(node.endLine);
          expect(node.endLine).toBeLessThanOrEqual(total);
          let previous: [number, number] = [0, 0];
          for (const child of node.childIds.map((id) => t.nodes[id])) {
            expect(child.startLine).toBeGreaterThanOrEqual(node.startLine);
            expect(child.endLine).toBeLessThanOrEqual(node.endLine);
            const start: [number, number] = [child.startLine, child.startCol];
            expect(start[0] > previous[0] || (start[0] === previous[0] && start[1] >= previous[1])).toBe(true);
            previous = start;
          }
        }
      }),
      RUNS,
    );
  });

  it("PR-9 plain JSON data", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const t = await parse(source);
        expect(JSON.parse(JSON.stringify(t))).toStrictEqual(t);
      }),
      RUNS,
    );
  });
});

describe("PR-10 parameterCount (P-16)", () => {
  it("only functions and methods, equal to the model", async () => {
    await fc.assert(
      fc.asyncProperty(program, async ({ source, params }) => {
        const nodes = nodesOf(await parse(source));
        for (const n of nodes) {
          const isDef = n.kind === "function" || n.kind === "method";
          expect(n.parameterCount !== undefined).toBe(isDef);
        }
        const counts = nodes.filter((n) => n.parameterCount !== undefined).map((n) => n.parameterCount);
        expect(counts).toEqual(params);
      }),
      RUNS,
    );
  });
});

describe("helpers (P-17 to P-20)", () => {
  const ids = (t: CodeTree): fc.Arbitrary<string> =>
    fc.oneof(fc.constantFrom(...Object.keys(t.nodes)), fc.string(), fc.constantFrom("constructor", "__proto__"));

  it("PR-11 relations never throw and siblings are inverse", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, fc.nat(), async (source, pick) => {
        const t = await parse(source);
        const keys = Object.keys(t.nodes);
        const id = keys[pick % keys.length];
        expect(parent(t, t.rootId)).toBeNull();
        expect(firstChild(t, id)?.id).toBe(t.nodes[id].childIds[0]);
        const next = nextSibling(t, id);
        if (next) expect(previousSibling(t, next.id)?.id).toBe(id);
        const prev = previousSibling(t, id);
        if (prev) expect(nextSibling(t, prev.id)?.id).toBe(id);
      }),
      RUNS,
    );
    const t = await parse("def f():\n  pass\n");
    await fc.assert(
      fc.property(ids(t), (id) => {
        for (const helper of [parent, firstChild, nextSibling, previousSibling]) {
          expect(() => helper(t, id)).not.toThrow();
        }
        if (!Object.hasOwn(t.nodes, id)) {
          expect([parent, firstChild, nextSibling, previousSibling].map((h) => h(t, id))).toEqual([null, null, null, null]);
        }
      }),
      RUNS,
    );
  });

  it("PR-12 nodeAtLine returns the deepest containing node", async () => {
    await fc.assert(
      fc.asyncProperty(program, fc.integer({ min: -3, max: 80 }), async ({ source }, line) => {
        const t = await parse(source);
        const total = lineCount(source);
        const found = nodeAtLine(t, line);
        if (line < 1 || line > total) {
          expect(found).toBeNull();
          return;
        }
        const contains = (n: TreeNode): boolean => n.startLine <= line && line <= n.endLine;
        expect(found && contains(found)).toBe(true);
        expect((found as TreeNode).childIds.some((id) => contains(t.nodes[id]))).toBe(false);
        for (let node: TreeNode | null = found; node; node = parent(t, node.id)) {
          expect(contains(node)).toBe(true);
          const before = (node.parentId ? t.nodes[node.parentId].childIds : []).slice(0, (node.parentId ? t.nodes[node.parentId].childIds.indexOf(node.id) : 0));
          expect(before.some((id) => contains(t.nodes[id]))).toBe(false);
        }
      }),
      RUNS,
    );
    expect(nodeAtLine(sampleTree, 1.5)).toBeNull();
  });

  it("PR-13 helpers do not mutate a frozen tree", async () => {
    await fc.assert(
      fc.asyncProperty(anySource, async (source) => {
        const t = deepFreeze(await parse(source));
        for (const node of nodesOf(t)) {
          parent(t, node.id);
          firstChild(t, node.id);
          nextSibling(t, node.id);
          previousSibling(t, node.id);
          nodeAtLine(t, node.startLine);
          describeNode(t, node);
        }
      }),
      RUNS,
    );
  });
});

describe("PR-14 describeNode is speech-safe (P-22)", () => {
  it("non-empty, one line, short, no banned characters, stable", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(anySource, program.map((p) => p.source)), async (source) => {
        const t = await parse(source);
        for (const node of nodesOf(t)) {
          const text = describeNode(t, node);
          expect(text.length).toBeGreaterThan(0);
          expect(text.length).toBeLessThanOrEqual(200);
          expect(text).toBe(text.trim());
          expect(text).not.toMatch(/[\r\n\u2028\u2029`*#<>{}[\]|\\]/);
          expect(text).not.toMatch(/[(:]/);
          expect(describeNode(t, node)).toBe(text);
        }
      }),
      RUNS,
    );
  });
});
