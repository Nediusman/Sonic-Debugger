# Project context: Sonic Debugger

Sonic Debugger is a debugging tool for blind and low-vision developers. It is
a Kiroween 2026 hackathon entry (Best Student Project: Frankenstein). Judges
score Potential Impact, Technological Implementation (how deeply Kiro is
used), Design, Innovation, and Presentation.

Core flow, the only flow that must be excellent:
open a Python file -> hear its structure -> run it -> hear exactly where and
why it failed -> fix it, without a mouse and without looking at the screen.

Four stitched technologies:
1. Skeleton: code parsing (web-tree-sitter) into a navigable tree.
2. Voice: audio sonification of that tree (Web Audio API).
3. Brain: an LLM that narrates errors in short plain language.
4. Nervous system: keyboard-only navigation with ARIA and text-to-speech.

Stack: TypeScript, React, web-tree-sitter, Web Audio API, Pyodide, one
serverless route for LLM calls.

Non-negotiable rules:
- Everything must work with the keyboard alone and with a screen reader.
- Never convey information by color alone, or by sound alone: every sound has
  a text and speech equivalent.
- Sonification must be deterministic: the same code always yields the same
  sound pattern.
- Do not invent features outside the specs. If a spec is silent, ask.
- Keep functions small and typed. No dead code, no TODO left behind.
- Work only in your own module directory unless the task says otherwise.
- Every change must keep the test suite and the accessibility lint passing.

Repo requirements: public GitHub repo, open-source license file at the root,
and the .kiro directory committed (never in .gitignore). Other steering
files: accessibility.md, workflow.md, and contracts.md are always loaded;
sonification-rules.md and testing.md are loaded by the agents that need them.
If any prompt disagrees with contracts.md on a name or signature,
contracts.md wins.
