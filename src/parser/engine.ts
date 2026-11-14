import { Language, Parser } from "web-tree-sitter";
import { resolveLoader, setLoaderOverride, type WasmLoader } from "./loader";

let runtimeReady: Promise<void> | null = null;
let language: Promise<Language> | null = null;

async function initRuntime(loader: WasmLoader): Promise<void> {
  const runtime = await loader.runtime();
  await Parser.init(
    typeof runtime === "string"
      ? { locateFile: () => runtime }
      : { wasmBinary: runtime },
  );
}

async function loadLanguage(): Promise<Language> {
  const loader = await resolveLoader();
  runtimeReady ??= initRuntime(loader);
  await runtimeReady;
  return Language.load(await loader.grammar());
}

/** Shares one initialisation between callers; clears it on failure (P-23, P-25). */
export function getLanguage(): Promise<Language> {
  language ??= loadLanguage();
  const current = language;
  current.catch(() => {
    if (language === current) resetEngine();
  });
  return current;
}

export function resetEngine(): void {
  language = null;
  runtimeReady = null;
}

export function configureParser(loader: WasmLoader): void {
  setLoaderOverride(loader);
  language = null;
}

export { Parser };
