import type { RunResult } from "../shared/types";
import { createBrowserWorker } from "./run/browserWorker";
import { type RuntimeStatus, createRunner } from "./run/runner";

export { narrate } from "./narrate/narrate";
export type { RuntimeStatus } from "./run/runner";

let shared: ReturnType<typeof createRunner> | undefined;

function runner(): ReturnType<typeof createRunner> {
  shared ??= createRunner({ createWorker: createBrowserWorker });
  return shared;
}

export function runCode(source: string): Promise<RunResult> {
  return runner().runCode(source);
}

/** Calls back with the current status at once, then on every change. Returns an unsubscribe function. */
export function onRuntimeStatus(callback: (status: RuntimeStatus) => void): () => void {
  return runner().onRuntimeStatus(callback);
}

/** Starts loading Python in the background. Safe to call twice. */
export function preloadRuntime(): void {
  runner().preloadRuntime();
}
