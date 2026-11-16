import { renderToStaticMarkup } from "react-dom/server";
import type { CodeTree, NavState } from "../../shared/types";
import { StructureTree } from "../index";

export interface Rendered {
  id: string;
  attrs: Record<string, string>;
  tag: string;
}

export function render(tree: CodeTree, state: NavState): { html: string; items: Rendered[] } {
  const html = renderToStaticMarkup(
    <StructureTree tree={tree} state={state} onKeyCommand={() => undefined} onItemFocus={() => undefined} />,
  );
  const items = [...html.matchAll(/<li ([^>]*)>/g)].map((m) => {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    return { id: attrs.id, attrs, tag: m[0] };
  });
  return { html, items };
}
