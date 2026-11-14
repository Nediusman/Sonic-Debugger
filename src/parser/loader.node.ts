import type { WasmLoader } from "./loader";

// Specifiers are held in variables so bundlers do not pull Node built-ins
// into the browser build.
const FS_MODULE = "node:fs/promises";
const MODULE_MODULE = "node:module";

async function readWasm(specifier: string): Promise<Uint8Array> {
  const { readFile } = await import(/* @vite-ignore */ FS_MODULE);
  const { createRequire } = await import(/* @vite-ignore */ MODULE_MODULE);
  const path: string = createRequire(import.meta.url).resolve(specifier);
  return new Uint8Array(await readFile(path));
}

export const nodeLoader: WasmLoader = {
  runtime: () => readWasm("web-tree-sitter/web-tree-sitter.wasm"),
  grammar: () => readWasm("tree-sitter-python/tree-sitter-python.wasm"),
};
