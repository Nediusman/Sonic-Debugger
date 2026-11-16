export type WorkerRequest = { type: "preload" } | { type: "run"; id: number; source: string };

export type WorkerStatus = "loading" | "ready" | "failed";

export type WorkerResponse =
  | { type: "status"; status: WorkerStatus }
  | { type: "started"; id: number }
  | { type: "result"; id: number; raw: unknown };

/** Minimal Worker surface the runner needs, so tests can fake it. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}
