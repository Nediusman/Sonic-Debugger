import type { NodeKind } from "../shared/types";
import { LEGEND_KINDS, LEGEND_TREE } from "./legendTree";
import type { AppServices } from "./services";

export interface LegendRow {
  kind: NodeKind;
  nodeId: string;
  text: string;
}

/** One row per sound-producing kind, with the text equivalent of its first sound. */
export function legendRows(services: AppServices): LegendRow[] {
  return LEGEND_KINDS.map((kind) => {
    const nodeId = `legend-${kind}`;
    const first = services.sonifyNode(LEGEND_TREE, nodeId).find((e) => e.nodeId === nodeId);
    return { kind, nodeId, text: first ? services.describeSoundEvent(first, LEGEND_TREE) : "No sound" };
  });
}
