import { describeNode, parse } from "../parser";
import { narrate, onRuntimeStatus, preloadRuntime, runCode } from "../narration";
import { createSpeaker } from "../navigation";
import {
  createPlayer, describeOverview, describeSoundEvent, sonifyError, sonifyNode, sonifyTree,
} from "../sonification";
import type { AppServices } from "../ui/services";
import type { SettingsStorage } from "../ui/storage";

function browserStorage(): SettingsStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The real services, built only from the modules' index.ts exports. */
export function createServices(): AppServices {
  return {
    parse,
    runCode,
    narrate,
    onRuntimeStatus,
    preloadRuntime,
    sonifyTree,
    sonifyNode,
    sonifyError,
    describeSoundEvent,
    describeOverview,
    describeNode: (tree, id) => describeNode(tree, tree.nodes[id]),
    createPlayer,
    createAudioContext: () => new AudioContext(),
    createSpeaker,
    storage: browserStorage(),
  };
}
