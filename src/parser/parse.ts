import type { CodeTree } from "../shared/types";
import { convert, emptyTree } from "./convert";
import { getLanguage, Parser, resetEngine } from "./engine";
import { normaliseLineEndings } from "./text";

export const LOAD_FAILURE_MESSAGE =
  "Code analysis could not start. You can still edit and run the code.";

function failureTree(source: string): CodeTree {
  return emptyTree(source, [{ line: 1, column: 0, message: LOAD_FAILURE_MESSAGE }]);
}

async function parseNormalised(source: string): Promise<CodeTree> {
  const language = await getLanguage();
  const parser = new Parser();
  try {
    parser.setLanguage(language);
    const syntax = parser.parse(source);
    if (!syntax) return failureTree(source);
    try {
      return convert(syntax.rootNode, source);
    } finally {
      syntax.delete();
    }
  } finally {
    parser.delete();
  }
}

/** Never rejects. Bad input gives a partial tree plus issues (P-1, P-4, P-25). */
export async function parse(source: string): Promise<CodeTree> {
  const text = normaliseLineEndings(String(source));
  try {
    return await parseNormalised(text);
  } catch {
    resetEngine();
    return failureTree(text);
  }
}
