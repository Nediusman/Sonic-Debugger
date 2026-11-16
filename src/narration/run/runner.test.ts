import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeWorker, type Script, answering } from "./fakeWorker";
import { type RuntimeStatus, createRunner } from "./runner";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(script: Script) {
  const workers: FakeWorker[] = [];
  const runner = createRunner({
    createWorker: () => {
      const w = new FakeWorker(script);
      workers.push(w);
      return w;
    },
  });
  return { runner, workers };
}

describe("runner", () => {
  it("resolves a clean run (E-2)", async () => {
    const { runner } = setup(answering({ stdout: "hello\n", error: null }));
    expect(await runner.runCode("print('hello')")).toEqual({ ok: true, source: "print('hello')", stdout: "hello\n" });
  });

  it("resolves a failing run with frames (E-5)", async () => {
    const raw = { stdout: "", error: { type: "ZeroDivisionError", message: "division by zero", traceback: '  File "main.py", line 1, in <module>\n' } };
    const { runner } = setup(answering(raw));
    const result = await runner.runCode("1/0");
    expect(result.ok).toBe(false);
    expect(result.error?.frames).toEqual([{ file: "main.py", line: 1, fn: "<module>" }]);
  });

  it("reuses one worker for several runs and queues them in order (A-E2)", async () => {
    const order: string[] = [];
    const { runner, workers } = setup((request, worker) => {
      if (request.type !== "run") return;
      order.push(request.source);
      answering({ stdout: request.source, error: null })(request, worker);
    });
    const results = await Promise.all([runner.runCode("a"), runner.runCode("b"), runner.runCode("c")]);
    expect(results.map((r) => r.stdout)).toEqual(["a", "b", "c"]);
    expect(order).toEqual(["a", "b", "c"]);
    expect(workers).toHaveLength(1);
  });

  it("stops a run after 10 seconds, replaces the worker and keeps working (E-8)", async () => {
    let hang = true;
    const { runner, workers } = setup((request, worker) => {
      if (request.type !== "run") return;
      if (hang) worker.emit({ type: "started", id: request.id });
      else answering({ stdout: "ok", error: null })(request, worker);
    });
    const pending = runner.runCode("while True: pass");
    await vi.advanceTimersByTimeAsync(9999);
    expect(workers[0].terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({
      ok: false,
      source: "while True: pass",
      stdout: "",
      error: { type: "TimeoutError", message: "The program ran for more than 10 seconds and was stopped", frames: [] },
    });
    expect(workers[0].terminated).toBe(true);
    hang = false;
    expect((await runner.runCode("x")).stdout).toBe("ok");
    expect(workers).toHaveLength(2);
  });

  it("does not count loading time against the run limit (E-9)", async () => {
    const { runner } = setup((request, worker) => {
      if (request.type !== "run") return;
      setTimeout(() => answering({ stdout: "late", error: null })(request, worker), 30000);
    });
    const pending = runner.runCode("x");
    await vi.advanceTimersByTimeAsync(30000);
    expect((await pending).stdout).toBe("late");
  });

  it("reports RuntimeUnavailable when loading fails (E-10)", async () => {
    const { runner, workers } = setup((request, worker) => {
      if (request.type === "run") worker.emit({ type: "status", status: "failed" });
    });
    const seen: RuntimeStatus[] = [];
    runner.onRuntimeStatus((s) => seen.push(s));
    const result = await runner.runCode("x");
    expect(result.error).toEqual({ type: "RuntimeUnavailable", message: "Python could not start in this browser", frames: [] });
    expect(result.ok).toBe(false);
    expect(workers[0].terminated).toBe(true);
    expect(seen).toEqual(["idle", "loading", "failed"]);
  });

  it("gives up when loading never finishes", async () => {
    const { runner } = setup(() => undefined);
    const pending = runner.runCode("x");
    await vi.advanceTimersByTimeAsync(60000);
    expect((await pending).error?.type).toBe("RuntimeUnavailable");
  });

  it("reports RuntimeUnavailable when the worker errors or cannot be created", async () => {
    const { runner } = setup((request, worker) => {
      if (request.type === "run") worker.onerror?.({});
    });
    expect((await runner.runCode("x")).error?.type).toBe("RuntimeUnavailable");
    const broken = createRunner({ createWorker: () => { throw new Error("no Worker"); } });
    expect((await broken.runCode("x")).error?.type).toBe("RuntimeUnavailable");
  });

  it("retries loading on the next run after a failure", async () => {
    let fail = true;
    const { runner, workers } = setup((request, worker) => {
      if (request.type !== "run") return;
      if (fail) worker.emit({ type: "status", status: "failed" });
      else answering({ stdout: "ok", error: null })(request, worker);
    });
    await runner.runCode("x");
    fail = false;
    expect((await runner.runCode("x")).ok).toBe(true);
    expect(workers).toHaveLength(2);
  });

  it("reports loading, ready and unsubscribes (E-9)", async () => {
    const { runner } = setup(answering({ stdout: "", error: null }));
    const seen: RuntimeStatus[] = [];
    const off = runner.onRuntimeStatus((s) => seen.push(s));
    await runner.runCode("x");
    off();
    runner.preloadRuntime();
    expect(seen).toEqual(["idle", "loading", "ready"]);
  });

  it("preloads once and is safe to call twice", () => {
    const { runner, workers } = setup(answering(null));
    runner.preloadRuntime();
    runner.preloadRuntime();
    expect(workers).toHaveLength(1);
  });

  it("marks preload failure and survives a throwing factory", () => {
    const runner = createRunner({ createWorker: () => { throw new Error("x"); } });
    const seen: RuntimeStatus[] = [];
    runner.onRuntimeStatus((s) => seen.push(s));
    runner.preloadRuntime();
    expect(seen.at(-1)).toBe("failed");
  });

  it("ignores messages for other runs and garbage messages", async () => {
    const { runner } = setup((request, worker) => {
      if (request.type !== "run") return;
      worker.emit(null);
      worker.emit("text");
      worker.emit({ type: "result", id: request.id + 99, raw: { stdout: "wrong", error: null } });
      worker.emit({ type: "started", id: request.id });
      worker.emit({ type: "result", id: request.id, raw: { stdout: "right", error: null } });
    });
    expect((await runner.runCode("x")).stdout).toBe("right");
  });

  it("ignores late messages from a replaced worker", async () => {
    const { runner, workers } = setup((request, worker) => {
      if (request.type === "run") worker.emit({ type: "started", id: request.id });
    });
    const pending = runner.runCode("x");
    await vi.advanceTimersByTimeAsync(10000);
    await pending;
    expect(() => workers[0].emit({ type: "status", status: "ready" })).not.toThrow();
  });
});
