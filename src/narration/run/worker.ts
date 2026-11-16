import { HARNESS } from "./harness";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<{
    runPython(code: string): unknown;
    globals: { get(name: string): unknown };
  }>;
}

interface WorkerScope {
  postMessage(message: WorkerResponse): void;
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
}

const scope = self as unknown as WorkerScope;
let runner: Promise<(source: string) => string> | null = null;

async function load(): Promise<(source: string) => string> {
  scope.postMessage({ type: "status", status: "loading" });
  const module = (await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`)) as PyodideModule;
  const pyodide = await module.loadPyodide({ indexURL: PYODIDE_BASE });
  pyodide.runPython(HARNESS);
  scope.postMessage({ type: "status", status: "ready" });
  return pyodide.globals.get("_run") as (source: string) => string;
}

function ensureLoaded(): Promise<(source: string) => string> {
  runner ??= load();
  return runner;
}

async function handle(request: WorkerRequest): Promise<void> {
  try {
    const run = await ensureLoaded();
    if (request.type === "preload") return;
    scope.postMessage({ type: "started", id: request.id });
    scope.postMessage({ type: "result", id: request.id, raw: JSON.parse(run(request.source)) });
  } catch {
    scope.postMessage({ type: "status", status: "failed" });
  }
}

scope.onmessage = (event) => {
  void handle(event.data);
};
