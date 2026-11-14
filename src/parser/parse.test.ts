import { describe, expect, it } from "vitest";
import { describeNode, nodeAtLine, parse } from "./index";
import type { CodeTree, TreeNode } from "../shared/types";

const all = (t: CodeTree): TreeNode[] => Object.values(t.nodes);
const byKind = (t: CodeTree, kind: string): TreeNode[] => all(t).filter((n) => n.kind === kind);
const root = (t: CodeTree): TreeNode => t.nodes[t.rootId];
const children = (t: CodeTree, n: TreeNode): TreeNode[] => n.childIds.map((id) => t.nodes[id]);

describe("parse basics", () => {
  it("empty source gives only the module root and no issues (P-2)", async () => {
    const t = await parse("");
    expect(Object.keys(t.nodes)).toEqual(["n00000"]);
    expect(t.issues).toEqual([]);
    expect(root(t)).toMatchObject({ kind: "module", depth: 0, parentId: null, startLine: 1, endLine: 1 });
  });

  it("one-line file", async () => {
    const t = await parse("x = 1");
    expect(children(t, root(t)).map((n) => [n.kind, n.name])).toEqual([["assignment", "x"]]);
  });

  it("functions, methods, classes, parameters (P-14, P-16)", async () => {
    const t = await parse(
      "class A:\n  def m(self, a, b=1, *args, k, **kw):\n    def inner(): pass\n  async def n(): pass\n  @dec\n  def d(x, /, y, *, z): pass\n  class B:\n    def q(self): pass\ndef f(a): return a\n",
    );
    const m = (name: string): TreeNode => all(t).find((n) => n.name === name) as TreeNode;
    expect(m("m")).toMatchObject({ kind: "method", parameterCount: 6 });
    expect(m("inner")).toMatchObject({ kind: "function", parameterCount: 0 });
    expect(m("n")).toMatchObject({ kind: "method", parameterCount: 0 });
    expect(m("d")).toMatchObject({ kind: "method", parameterCount: 3 });
    expect(m("q").kind).toBe("method");
    expect(m("B").kind).toBe("class");
    expect(m("f")).toMatchObject({ kind: "function", parameterCount: 1 });
    expect(m("A").parameterCount).toBeUndefined();
    expect(describeNode(t, m("A"))).toBe("class A, 3 methods, 8 lines");
  });

  it("assigns pre-order ids (P-12)", async () => {
    const t = await parse("def f():\n  x = 1\n  y = 2\nz = 3\n");
    const ids = Object.keys(t.nodes);
    expect(ids).toEqual([...ids].sort());
    expect(ids[0]).toBe("n00000");
    expect(t.nodes.n00001.name).toBe("f");
    expect(t.nodes.n00002.name).toBe("x");
  });

  it("maps every kind in Table P-1 (P-13)", async () => {
    const src = [
      "import os.path",
      "from collections import deque",
      "for i in r:",
      "  pass",
      "else:",
      "  print(i)",
      "while c: break",
      "if a:",
      "  pass",
      "elif b:",
      "  pass",
      "else:",
      "  pass",
      "try:",
      "  obj.method(1)",
      "except E:",
      "  raise X",
      "finally:",
      "  total += 1",
      "with f: assert x",
      "match v:",
      "  case 1: return 2",
      "lambda: 1",
      "",
    ].join("\n");
    const t = await parse(src);
    expect(t.issues).toEqual([]);
    const summary = all(t).map((n) => `${n.kind}:${n.name ?? ""}`);
    expect(summary).toEqual([
      "module:", "import:os.path", "import:collections", "loop:", "call:print", "loop:",
      "conditional:if", "conditional:elif", "conditional:else", "try:", "call:obj.method",
      "other:raise", "assignment:total", "other:with", "other:assert", "other:match", "return:",
    ]);
    const ifNode = byKind(t, "conditional")[0];
    expect(children(t, ifNode).map((n) => n.name)).toEqual(["elif", "else"]);
  });

  it("sanitises call names (no [ ( or :) and truncates to 40", async () => {
    const t = await parse("a[0](1)\nf(1)(2)\n" + "x".repeat(60) + "()\n");
    const names = byKind(t, "call").map((n) => n.name);
    for (const n of names) expect(n).not.toMatch(/[[(:]/);
    expect(names[2]).toHaveLength(40);
  });

  it("handles 200 nesting levels (edge)", async () => {
    let src = "";
    for (let i = 0; i < 200; i++) src += " ".repeat(i) + "if x:\n";
    src += " ".repeat(200) + "pass\n";
    const t = await parse(src);
    expect(byKind(t, "conditional")).toHaveLength(200);
    expect(Math.max(...all(t).map((n) => n.depth))).toBe(200);
  });

  it("edge sources never throw and keep a root", async () => {
    for (const src of ["# only comments\n", "@dec\n", "é = 1\n\tx = 2", "a\u0000b", "x" .repeat(100000)]) {
      const t = await parse(src);
      expect(root(t).kind).toBe("module");
    }
  });

  it("non-ASCII identifiers keep names and columns in characters", async () => {
    const t = await parse("def café(): pass\n");
    expect(t.nodes.n00001).toMatchObject({ name: "café", endCol: 16 });
  });

  it("else on for or while is not a node (P-13)", async () => {
    const t = await parse("while a:\n  pass\nelse:\n  f()\n");
    expect(byKind(t, "conditional")).toEqual([]);
    expect(children(t, byKind(t, "loop")[0]).map((n) => n.name)).toEqual(["f"]);
  });

  it("CRLF and CR give the LF tree (P-6)", async () => {
    const lf = await parse("def f():\n  return 1\n");
    expect(await parse("def f():\r\n  return 1\r\n")).toEqual(lf);
    expect(await parse("def f():\r  return 1\r")).toEqual(lf);
  });

  it("nodeAtLine finds the deepest node on a real tree", async () => {
    const t = await parse("def f():\n  if a:\n    return 1\n");
    expect(nodeAtLine(t, 3)?.kind).toBe("return");
    expect(nodeAtLine(t, 1)?.kind).toBe("function");
  });
});

describe("syntax issues (P-4, P-5)", () => {
  it("keeps good constructs and reports plain issues", async () => {
    const t = await parse("def good():\n  return 1\ndef bad(:\n  pass\nx = (1,\n");
    expect(byKind(t, "function").map((n) => n.name)).toContain("good");
    expect(t.issues.length).toBeGreaterThan(0);
    for (const i of t.issues) {
      expect(i.message.length).toBeGreaterThan(0);
      expect(i.message.length).toBeLessThanOrEqual(120);
      expect(i.message).not.toMatch(/ERROR|MISSING/);
      expect(i.line).toBeGreaterThanOrEqual(1);
    }
  });

  it("reports a missing colon", async () => {
    const t = await parse("if x\n  pass\n");
    expect(t.issues.length).toBeGreaterThan(0);
    expect(t.issues[0].line).toBe(1);
  });
});
