---
inclusion: always
---

# Workflow rules

- One module per agent. Work only inside your own src/<module>/ directory and
  its tests. Shared types live in src/shared/ and change only through the spec.
- Never edit .kiro/steering/ or another module's spec without asking.
- Commit small and often: spec(parser): ..., feat(sonification): ...,
  test(narration): ..., fix(ui): ... Use one branch per agent when running in
  parallel.
- Tick a task in tasks.md only when its code, tests, and checks pass.
- Never commit secrets. Keep keys in .env, which is gitignored. Never add
  .kiro to .gitignore.
- Keep README.md current: what it is, how to run, how to test, keyboard map,
  and the license (MIT unless changed).
- When a spec is wrong or unclear, stop and report instead of working around
  it.
