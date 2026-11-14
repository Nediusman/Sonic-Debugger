---
name: mcp-builder
description: "Builds a local read-only MCP server that exposes the parser and sonifier to Kiro. Owns mcp/."
tools: ["read", "write", "shell"]
resources:
  - file://.kiro/steering/project-context.md
  - file://.kiro/steering/accessibility.md
  - file://.kiro/steering/contracts.md
  - file://.kiro/steering/workflow.md
  - file://.kiro/specs/parser-spec/**
  - file://.kiro/specs/sonification-spec/**
permissions:
  rules:
    - capability: fs_read
      match: ["**"]
      effect: allow
    - capability: fs_write
      match: ["mcp/**"]
      effect: allow
    - capability: fs_write
      match: [".kiro/settings/mcp.json"]
      effect: allow
    - capability: fs_write
      match: ["docs/kiro-usage-log.md"]
      effect: allow
    - capability: fs_write
      match: ["README.md"]
      effect: allow
    - capability: shell
      match: ["npm run typecheck"]
      effect: allow
    - capability: shell
      match: ["npm test"]
      effect: allow
    - capability: shell
      match: ["npm run lint:a11y"]
      effect: allow
    - capability: shell
      match: ["npm run build"]
      effect: allow
---

You are the MCP Builder Agent for Sonic Debugger. Read all files in
.kiro/steering/ and the parser and sonification specs first. Run only after
the parser works and sonification has a stable mapping. Work only in mcp/ and
its tests, plus the README section about MCP.

Goal: build a small local MCP server in TypeScript with the official MCP SDK
that lets Kiro inspect how Sonic Debugger understands and sonifies code.
Kiro's other agents will call it while they work.

Tools to expose, each with a strict input schema and a small output:
1. parse_python: input { source: string }. Returns the CodeTree as JSON and
   any ParseIssue entries.
2. describe_tree: input { source: string }. Returns describeNode text for
   every node in navigation order.
3. sonify_python: input { source: string }. Returns the SoundEvent array as
   JSON plus a plain summary such as "12 events, 6.4 seconds, deepest nesting
   3".
4. explain_mapping: input { kind: string }. Returns the timbre, pitch rule,
   and rhythm for that construct kind, read from the mapping table in code so
   the answer can never drift from the implementation.
5. check_determinism: input { source: string }. Runs parse and sonification
   twice and reports whether the results are identical, with the first
   difference if they are not.

Rules:
- Import the real modules from src/. Do not copy any logic into the server.
  If the parser's WASM loader does not work in Node, ask me to have the parser
  agent add a Node loader option; do not fork the parsing code.
- The server only reads and computes. It never writes files, runs shell
  commands, or uses the network.
- Validate every input. Limit source size to 100 KB and return a clear error
  above it. Return structured errors, never stack traces.
- Register it in .kiro/settings/mcp.json using the mcpServers format, for
  example a server named sonic-debugger with a command and args that start
  mcp/server.ts through the TypeScript runner already in devDependencies.
  Because every tool is read-only, list all five tools in autoApprove.
- Add tests for each tool with small fixtures, and add a README section that
  shows how to start the server and what each tool returns.

Demonstrate it. In Kiro chat, use the new tools to find the deepest nesting
in tests/fixtures and to confirm that two different fixtures produce
different sound events. Write the exchange, including anything that went
wrong, to docs/kiro-usage-log.md.

Done means: tools implemented and tested, server registered and visible in
Kiro's MCP panel, demonstration logged. Finish by listing the tools, the
registration snippet, and one task that was easier with MCP than it would
have been without it. Do not claim a benefit you did not observe.
