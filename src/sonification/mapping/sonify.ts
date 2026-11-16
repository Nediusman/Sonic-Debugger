import type { CodeTree, SoundEvent, SonifyOptions } from "../../shared/types";
import { defaultProfile, type SoundProfile } from "./profile";
import { focusLayout, overviewLayout, describeOverview as describeLayout } from "./layout";
import { applyLevel } from "./level";
import { errorEvents } from "./error";
import { sortEvents } from "./order";
import { nodeEvents, type Slot } from "./timbre";
function render(slots: Slot[], options: SonifyOptions | undefined, profile: SoundProfile): SoundEvent[] {
  return sortEvents(applyLevel(slots.flatMap((s) => nodeEvents(s, profile)), options));
}
export function sonifyTree(tree: CodeTree, options?: SonifyOptions, profile: SoundProfile = defaultProfile): SoundEvent[] {
  return render(overviewLayout(tree, profile).slots, options, profile);
}
export function sonifyNode(tree: CodeTree, nodeId: string, options?: SonifyOptions, profile: SoundProfile = defaultProfile): SoundEvent[] {
  return render(focusLayout(tree, nodeId, profile), options, profile);
}
export function sonifyError(tree: CodeTree, line: number, options?: SonifyOptions, profile: SoundProfile = defaultProfile): SoundEvent[] {
  return sortEvents(applyLevel(errorEvents(tree, line, profile), options));
}
export function describeOverview(tree: CodeTree, _options?: SonifyOptions, profile: SoundProfile = defaultProfile): string {
  return describeLayout(overviewLayout(tree, profile));
}
