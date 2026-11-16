import type { WorkerLike, WorkerRequest } from "./protocol";

export type Script = (request: WorkerRequest, worker: FakeWorker) => void;

/** Test double for a Pyodide worker: a script decides what each request answers. */
export class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminated = false;
  requests: WorkerRequest[] = [];

  constructor(private readonly script: Script) {}

  postMessage(message: WorkerRequest): void {
    this.requests.push(message);
    this.script(message, this);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data });
  }
}

/** Answers every run with the given raw payload, after a ready status. */
export const answering = (raw: unknown): Script => (request, worker) => {
  if (request.type === "preload") {
    worker.emit({ type: "status", status: "ready" });
    return;
  }
  worker.emit({ type: "status", status: "ready" });
  worker.emit({ type: "started", id: request.id });
  worker.emit({ type: "result", id: request.id, raw });
};
