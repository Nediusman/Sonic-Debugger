import runtimeUrl from "web-tree-sitter/web-tree-sitter.wasm?url";
import grammarUrl from "tree-sitter-python/tree-sitter-python.wasm?url";
import type { WasmLoader } from "./loader";

export const browserLoader: WasmLoader = {
  runtime: () => Promise.resolve(runtimeUrl),
  grammar: () => Promise.resolve(grammarUrl),
};
