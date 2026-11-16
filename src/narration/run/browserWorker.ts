import type { WorkerLike } from "./protocol";

export function createBrowserWorker(): WorkerLike {
  return new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
}
