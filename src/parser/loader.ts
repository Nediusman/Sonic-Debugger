export interface WasmLoader {
  /** Bytes or URL of web-tree-sitter.wasm. */
  runtime(): Promise<Uint8Array | string>;
  /** Bytes or URL of tree-sitter-python.wasm. */
  grammar(): Promise<Uint8Array | string>;
}

let override: WasmLoader | null = null;

export function setLoaderOverride(loader: WasmLoader | null): void {
  override = loader;
}

function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    Boolean(process.versions?.node) &&
    typeof window === "undefined"
  );
}

export async function resolveLoader(): Promise<WasmLoader> {
  if (override) return override;
  if (isNode()) return (await import("./loader.node")).nodeLoader;
  return (await import("./loader.browser")).browserLoader;
}
