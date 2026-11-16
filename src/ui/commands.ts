import {
  SPEECH_UNSUPPORTED_MESSAGE, intentToAction, navigate,
  type KeyCommand, type NavAction, type Speaker,
} from "../navigation";
import type { CodeTree, NarrationResult, RunResult } from "../shared/types";
import type { AudioController } from "./audio";
import { LEGEND_TREE } from "./legendTree";
import {
  errorMessage, explanationMessage, exampleMessage, finishedMessage, lineProblemMessage,
  openedMessage, structureMessage, toggleMessage,
} from "./messages";
import { EXAMPLE_SOURCE } from "./example";
import { countLines, failingLine, lineStartOffset, type AppAction, type AppState } from "./state";
import type { AppServices } from "./services";

export type DialogName = "settings" | "legend" | "welcome";

/** The few things commands need from the page itself. */
export interface UiBridge {
  say(message: string): void;
  alert(message: string): void;
  clearAlert(): void;
  focusTree(): void;
  focusEditor(offset: number): void;
  focusKeys(): void;
  openDialog(name: DialogName): void;
}

export interface CommandDeps {
  services: AppServices;
  getState(): AppState;
  dispatch(action: AppAction): void;
  ui: UiBridge;
  audio: AudioController;
  speaker: Speaker;
}

export const SOMETHING_WRONG = "Something went wrong with this action. Your code is unchanged.";
export const NO_ERROR_MESSAGE = "No error to go to. Run the code first.";
export const NO_EXPLANATION_MESSAGE = "No explanation yet. Run the code.";

function aborted(source: string, tree: CodeTree): { result: RunResult; narration: NarrationResult } {
  return {
    result: { ok: false, source, stdout: "", error: { type: "Error", message: "The run could not finish", frames: [] } },
    narration: {
      summary: "The run could not finish.", location: "", cause: "", suggestedFix: "Try running again.",
      nodeId: tree.rootId, offline: true,
    },
  };
}

export function createCommands(deps: CommandDeps) {
  const { services, getState, dispatch, ui, audio, speaker } = deps;
  let parseSeq = 0;
  let speechActive = false;

  const sound = () => ({ reducedSound: getState().settings.reducedSound });

  function speak(text: string): void {
    if (!speaker.enabled) return;
    speechActive = true;
    speaker.speak(text);
  }

  async function guard(action: () => Promise<void> | void): Promise<void> {
    try {
      await action();
    } catch {
      ui.alert(SOMETHING_WRONG);
    }
  }

  async function reparse(source: string): Promise<CodeTree> {
    const seq = ++parseSeq;
    const tree = await services.parse(source);
    if (seq === parseSeq && getState().source === source) dispatch({ type: "treeParsed", tree });
    return tree;
  }

  const constructs = (tree: CodeTree): number => Object.keys(tree.nodes).length;

  async function openSource(name: string, source: string): Promise<void> {
    await guard(async () => {
      dispatch({ type: "fileOpened", name, source });
      const tree = await reparse(source);
      ui.focusTree();
      ui.say(openedMessage(name, countLines(source), constructs(tree)));
    });
  }

  async function loadExample(): Promise<void> {
    await guard(async () => {
      dispatch({ type: "fileOpened", name: "example.py", source: EXAMPLE_SOURCE });
      await reparse(EXAMPLE_SOURCE);
      ui.say(exampleMessage(countLines(EXAMPLE_SOURCE)));
    });
  }

  async function editSettled(source: string): Promise<void> {
    await guard(async () => {
      const tree = await reparse(source);
      if (getState().source === source) ui.say(structureMessage(constructs(tree), tree.issues));
    });
  }

  function playOwnCue(nodeId: string): void {
    const { tree } = getState();
    audio.play(services.sonifyNode(tree, nodeId, sound()).filter((e) => e.nodeId === nodeId), tree);
  }

  function move(action: NavAction): void {
    const s = getState();
    const result = navigate(s.tree, s.nav, action);
    dispatch({ type: "navigated", nav: result.state });
    if (result.moved) {
      audio.stop();
      playOwnCue(result.state.focusId);
      speak(result.message);
    } else ui.say(result.message);
  }

  function goToError(): void {
    if (getState().nav.errorNodeId === null) ui.say(NO_ERROR_MESSAGE);
    else move({ type: "goToError" });
  }

  function playOverview(): void {
    audio.prepare();
    const { tree } = getState();
    const text = services.describeOverview(tree, sound());
    ui.say(text);
    speak(text);
    audio.play(services.sonifyTree(tree, sound()), tree);
  }

  function playFocus(): void {
    audio.prepare();
    const s = getState();
    const text = services.describeNode(s.tree, s.nav.focusId);
    ui.say(text);
    speak(text);
    audio.play(services.sonifyNode(s.tree, s.nav.focusId, sound()), s.tree);
  }

  function stopAudio(): void {
    const wasPlaying = audio.stop();
    speaker.cancel();
    const spoke = speechActive;
    speechActive = false;
    if (wasPlaying || spoke) ui.say("Sound stopped");
  }

  function toggleSpeech(): void {
    const on = !getState().settings.speech;
    if (on && !speaker.supported) {
      ui.say(SPEECH_UNSUPPORTED_MESSAGE);
      return;
    }
    dispatch({ type: "settingsChanged", settings: { speech: on } });
    ui.say(toggleMessage("Speech", on));
  }

  function toggleReducedSound(): void {
    const on = !getState().settings.reducedSound;
    dispatch({ type: "settingsChanged", settings: { reducedSound: on } });
    ui.say(toggleMessage("Reduced sound", on));
  }

  function playErrorCue(afterEnd?: () => void): void {
    const s = getState();
    if (s.run.result?.ok !== false) {
      afterEnd?.();
      return;
    }
    audio.play(services.sonifyError(s.tree, failingLine(s.run.result, s.tree), sound()), s.tree, afterEnd);
  }

  function repeatNarration(): void {
    audio.prepare();
    const n = getState().run.narration;
    if (!n) {
      ui.say(NO_EXPLANATION_MESSAGE);
      return;
    }
    const text = explanationMessage(n);
    ui.say(text);
    playErrorCue(() => speak(text));
  }

  function finishRun(result: RunResult, narration: NarrationResult): void {
    if (result.ok) {
      dispatch({ type: "runFinished", result, narration });
      ui.say(finishedMessage(result.stdout));
      return;
    }
    ui.alert(errorMessage(narration));
    dispatch({ type: "runFinished", result, narration });
    const spoken = explanationMessage(narration);
    playErrorCue(() => speak(spoken));
  }

  async function run(): Promise<void> {
    if (getState().run.status === "running") {
      ui.say("Already running");
      return;
    }
    audio.prepare();
    const source = getState().source;
    ui.say(getState().runtime === "ready" ? "Running" : "Loading Python, please wait");
    dispatch({ type: "runStarted" });
    ui.clearAlert();
    let tree = getState().tree;
    try {
      tree = await reparse(source);
      const result = await services.runCode(source);
      const narration = await services.narrate(result, tree);
      finishRun(result, narration);
    } catch {
      const fallback = aborted(source, tree);
      ui.alert(SOMETHING_WRONG);
      dispatch({ type: "runFinished", ...fallback });
    }
  }

  function editHere(): void {
    const s = getState();
    const node = s.tree.nodes[s.nav.focusId];
    ui.focusEditor(lineStartOffset(s.source, node.startLine));
    ui.say(`Editing line ${node.startLine}`);
  }

  function promptGoToLine(): void {
    dispatch({ type: "goToLineOpen", open: true });
    ui.say("Go to line, enter a number");
  }

  function closeGoToLine(): void {
    dispatch({ type: "goToLineOpen", open: false });
    ui.focusTree();
  }

  function submitGoToLine(input: string): void {
    const s = getState();
    const lines = countLines(s.source);
    const line = /^\s*\d+\s*$/.test(input) ? Number.parseInt(input, 10) : 0;
    if (line < 1 || line > lines) {
      ui.say(lineProblemMessage(input, lines));
      return;
    }
    dispatch({ type: "goToLineOpen", open: false });
    move({ type: "goToLine", line });
    ui.focusTree();
  }

  function playLegend(nodeId: string): void {
    audio.prepare();
    const events = services.sonifyNode(LEGEND_TREE, nodeId, sound()).filter((e) => e.nodeId === nodeId);
    audio.play(events, LEGEND_TREE);
  }

  function keyCommand(command: KeyCommand): void {
    if (command.kind === "nav") {
      const s = getState();
      move(intentToAction(s.tree, s.nav, command.intent));
      return;
    }
    const table: Record<typeof command.command, () => void | Promise<void>> = {
      promptGoToLine, goToError, playOverview, playFocus, stopAudio, run, toggleSpeech,
      toggleReducedSound, repeatNarration, editHere,
      showLegend: () => ui.openDialog("legend"),
      showKeys: () => ui.focusKeys(),
    };
    void guard(table[command.command]);
  }

  return {
    openSource, loadExample, editSettled, move, goToError, playOverview, playFocus, stopAudio,
    toggleSpeech, toggleReducedSound, repeatNarration, run, editHere, promptGoToLine, closeGoToLine,
    submitGoToLine, playLegend, keyCommand, guard,
  };
}

export type Commands = ReturnType<typeof createCommands>;
