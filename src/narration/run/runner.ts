import type { RunResult } from "../../shared/types";
import { TIMEOUT_MESSAGE, UNAVAILABLE_MESSAGE, failure, normalizeRun } from "./normalize";
import type { WorkerLike } from "./protocol";

export type RuntimeStatus = "idle" | "loading" | "ready" | "failed";

export interface RunnerOptions {
  createWorker: () => WorkerLike;
  /** Run limit in ms, counted from when Python starts the code (E-8). */
  runLimitMs?: number;
  /** Longest wait for Python to load before giving up (assumption in docs). */
  loadLimitMs?: number;
}

export interface Runner {
  runCode(source: string): Promise<RunResult>;
  onRuntimeStatus(callback: (status: RuntimeStatus) => void): () => void;
  preloadRuntime(): void;
}

interface Job {
  id: number;
  started(): void;
  result(raw: unknown): void;
  failed(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createRunner(options: RunnerOptions): Runner {
  const runLimitMs = options.runLimitMs ?? 10000;
  const loadLimitMs = options.loadLimitMs ?? 60000;
  const listeners = new Set<(status: RuntimeStatus) => void>();
  let status: RuntimeStatus = "idle";
  let worker: WorkerLike | null = null;
  let job: Job | null = null;
  let counter = 0;
  let tail: Promise<unknown> = Promise.resolve();

  function setStatus(next: RuntimeStatus): void {
    if (next === status) return;
    status = next;
    listeners.forEach((callback) => callback(next));
  }

  function discardWorker(next: RuntimeStatus): void {
    const old = worker;
    worker = null;
    try {
      old?.terminate();
    } catch {
      // The worker is already gone.
    }
    setStatus(next);
  }

  function onMessage(data: unknown): void {
    if (!isRecord(data)) return;
    if (data.type === "status") {
      if (data.status === "loading" || data.status === "ready") setStatus(data.status);
      else if (data.status === "failed" && job) job.failed();
      else if (data.status === "failed") discardWorker("failed");
    } else if (job && data.id === job.id) {
      if (data.type === "started") job.started();
      else if (data.type === "result") job.result(data.raw);
    }
  }

  function startWorker(): WorkerLike {
    const created = options.createWorker();
    worker = created;
    setStatus("loading");
    created.onmessage = (event) => {
      if (worker === created) onMessage(event.data);
    };
    created.onerror = () => {
      if (worker !== created) return;
      if (job) job.failed();
      else discardWorker("failed");
    };
    return created;
  }

  function execute(source: string): Promise<RunResult> {
    return new Promise((resolve) => {
      let target: WorkerLike;
      try {
        target = worker ?? startWorker();
      } catch {
        setStatus("failed");
        resolve(failure(source, "RuntimeUnavailable", UNAVAILABLE_MESSAGE));
        return;
      }
      const finish = (result: RunResult): void => {
        clearTimeout(timer);
        job = null;
        resolve(result);
      };
      const unavailable = (): void => {
        discardWorker("failed");
        finish(failure(source, "RuntimeUnavailable", UNAVAILABLE_MESSAGE));
      };
      let timer = setTimeout(unavailable, loadLimitMs);
      job = {
        id: ++counter,
        started: () => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            discardWorker("idle");
            finish(failure(source, "TimeoutError", TIMEOUT_MESSAGE));
          }, runLimitMs);
        },
        result: (raw) => finish(normalizeRun(source, raw)),
        failed: unavailable,
      };
      try {
        target.postMessage({ type: "run", id: job.id, source });
      } catch {
        unavailable();
      }
    });
  }

  return {
    runCode(source) {
      const text = typeof source === "string" ? source : String(source);
      const next = tail.then(() => execute(text)).catch(() => failure(text, "InternalError", "The runner failed"));
      tail = next;
      return next;
    },
    onRuntimeStatus(callback) {
      listeners.add(callback);
      callback(status);
      return () => {
        listeners.delete(callback);
      };
    },
    preloadRuntime() {
      try {
        (worker ?? startWorker()).postMessage({ type: "preload" });
      } catch {
        discardWorker("failed");
      }
    },
  };
}
