import type { CodeTree, NarrationResult, RunResult, SoundEvent } from "../shared/types";
import type { Player } from "../sonification";
import type { Speaker } from "../navigation";
import type { SettingsStorage } from "./storage";

type SoundOptions = { reducedSound?: boolean };
export type RuntimeStatus = "idle" | "loading" | "ready" | "failed";

/** Everything the UI needs from the other modules, so tests can inject fakes. */
export interface AppServices {
  parse(source: string): Promise<CodeTree>;
  runCode(source: string): Promise<RunResult>;
  narrate(run: RunResult, tree: CodeTree): Promise<NarrationResult>;
  onRuntimeStatus(cb: (s: RuntimeStatus) => void): () => void;
  preloadRuntime(): void;
  sonifyTree(tree: CodeTree, o?: SoundOptions): SoundEvent[];
  sonifyNode(tree: CodeTree, id: string, o?: SoundOptions): SoundEvent[];
  sonifyError(tree: CodeTree, line: number, o?: SoundOptions): SoundEvent[];
  describeSoundEvent(e: SoundEvent, tree: CodeTree): string;
  describeOverview(tree: CodeTree, o?: SoundOptions): string;
  describeNode(tree: CodeTree, id: string): string;
  createPlayer(ctx: AudioContext): Player;
  createAudioContext(): AudioContext;
  createSpeaker(): Speaker;
  storage: SettingsStorage | null;
}
