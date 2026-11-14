import fc from "fast-check";

/** A generated statement: relative lines plus the parameter counts of every def inside, pre-order. */
export interface Snippet {
  lines: string[];
  params: number[];
}

const NAMES = ["a", "b", "total", "item", "x1", "value", "café", "_tmp"];
const name = fc.constantFrom(...NAMES);

const simple: fc.Arbitrary<Snippet> = fc
  .oneof(
    name.map((n) => `${n} = 1`),
    name.map((n) => `${n} += 2`),
    name.map((n) => `print(${n})`),
    name.map((n) => `obj.${n}(1, 2)`),
    name.map((n) => `import ${n}`),
    name.map((n) => `from ${n} import thing`),
    fc.constant("pass"),
    fc.constant("# a comment"),
  )
  .map((line) => ({ lines: [line], params: [] }));

interface Signature {
  text: string;
  count: number;
}

const signature: fc.Arbitrary<Signature> = fc
  .record({
    plain: fc.nat(3),
    defaulted: fc.nat(2),
    splat: fc.boolean(),
    keywordOnly: fc.boolean(),
    kwargs: fc.boolean(),
  })
  .map(({ plain, defaulted, splat, keywordOnly, kwargs }) => {
    const parts: string[] = [];
    for (let i = 0; i < plain; i++) parts.push(`p${i}`);
    for (let i = 0; i < defaulted; i++) parts.push(`d${i}=0`);
    if (splat) parts.push("*args");
    if (splat && keywordOnly) parts.push("only");
    if (kwargs) parts.push("**kw");
    return { text: parts.join(", "), count: parts.length };
  });

function indent(snippets: Snippet[]): string[] {
  return snippets.flatMap((s) => s.lines.map((l) => `    ${l}`));
}

function block(header: string, body: Snippet[]): Snippet {
  return { lines: [header, ...indent(body)], params: body.flatMap((b) => b.params) };
}

function body(stmt: fc.Arbitrary<Snippet>): fc.Arbitrary<Snippet[]> {
  return fc.array(stmt, { minLength: 1, maxLength: 3 });
}

const cache = new Map<number, fc.Arbitrary<Snippet>>();

function definition(inner: fc.Arbitrary<Snippet>, prefix: fc.Arbitrary<string>): fc.Arbitrary<Snippet> {
  return fc
    .tuple(prefix, name, signature, body(inner), fc.boolean())
    .map(([pre, n, sig, stmts, hasReturn]) => {
      const ret: Snippet[] = hasReturn ? [{ lines: ["return 1"], params: [] }] : [];
      const snippet = block(`${pre}def ${n}(${sig.text}):`, [...stmts, ...ret]);
      return { ...snippet, params: [sig.count, ...snippet.params] };
    });
}

function compound(inner: fc.Arbitrary<Snippet>): fc.Arbitrary<Snippet> {
  const fn = definition(inner, fc.constantFrom("", "async "));
  const method = definition(simple, fc.constantFrom("", "async "));
  return fc.oneof(
    fn,
    fc.tuple(name, fc.array(method, { minLength: 1, maxLength: 3 })).map(([n, ms]) => block(`class ${n}:`, ms)),
    fc.tuple(body(inner), fc.boolean()).map(([b, orElse]) => {
      const loop = block("for i in range(3):", b);
      return orElse ? { lines: [...loop.lines, "else:", "    pass"], params: loop.params } : loop;
    }),
    body(inner).map((b) => block("while cond:", b)),
    fc.tuple(body(inner), body(inner), body(inner), fc.boolean(), fc.boolean()).map(([a, b, c, hasElif, hasElse]) => {
      const parts = [block("if cond:", a)];
      if (hasElif) parts.push(block("elif other:", b));
      if (hasElse) parts.push(block("else:", c));
      return { lines: parts.flatMap((p) => p.lines), params: parts.flatMap((p) => p.params) };
    }),
    fc.tuple(body(inner), body(inner), fc.boolean()).map(([a, b, fin]) => {
      const parts = [block("try:", a), block("except ValueError:", b)];
      if (fin) parts.push(block("finally:", [{ lines: ["pass"], params: [] }]));
      return { lines: parts.flatMap((p) => p.lines), params: parts.flatMap((p) => p.params) };
    }),
    body(inner).map((b) => block("with open(path) as f:", b)),
  );
}

function statement(depth: number): fc.Arbitrary<Snippet> {
  const cached = cache.get(depth);
  if (cached) return cached;
  const built = depth === 0 ? simple : fc.oneof({ weight: 2, arbitrary: simple }, { weight: 3, arbitrary: compound(statement(depth - 1)) });
  cache.set(depth, built);
  return built;
}

export interface Program {
  source: string;
  params: number[];
}

/** Valid Python source plus the parameter counts of its functions in pre-order. */
export const program: fc.Arbitrary<Program> = fc
  .array(statement(3), { minLength: 0, maxLength: 5 })
  .map((snippets) => ({
    source: snippets.flatMap((s) => s.lines).join("\n") + (snippets.length ? "\n" : ""),
    params: snippets.flatMap((s) => s.params),
  }));

const FRAGMENTS = ["def ", "class ", "(", ")", ":", "\n", "    ", "\t", "if ", "else", "elif ", "for ", "in ", "x", "=", "1", "return ", "try:", "except", "import ", "\"", "'", "[", "{", "\r", "@", "é", "\u0000"];

/** Text likely to hold syntax errors. */
export const brokenSource: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...FRAGMENTS), { maxLength: 40 })
  .map((parts) => parts.join(""));

/** Any string, including binary-looking text, and Python-ish noise. */
export const anySource: fc.Arbitrary<string> = fc.oneof(
  fc.string({ unit: "binary", maxLength: 200 }),
  brokenSource,
  program.map((p) => p.source.slice(0, Math.max(0, p.source.length - 7))),
);
