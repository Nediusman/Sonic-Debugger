import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { focusTreeItem, isStopAudioKey } from "../navigation";
import { AUDIO_FAILED_MESSAGE, createAudio } from "../ui/audio";
import { createCommands, type DialogName, type UiBridge } from "../ui/commands";
import { LegendDialog, SettingsDialog, WelcomeDialog } from "../ui/dialogs";
import { createAnnouncer } from "../ui/announcer";
import { KeysSection, EditorPanel, OutputPanel, StructurePanel, type ActionName, type Handlers } from "../ui/panels";
import type { AppServices } from "../ui/services";
import { createInitialState, DEFAULT_SETTINGS } from "../ui/state";
import { loadSettings, saveSettings } from "../ui/storage";
import { openFailedMessage } from "../ui/messages";
import { useStore } from "../ui/useStore";
import { createServices } from "./services";

const DEBOUNCE_MS = 300;
const MAX_FILE_BYTES = 1024 * 1024;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function readUtf8(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("it is larger than 1 megabyte");
  const bytes = await file.arrayBuffer();
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\u0000")) throw new Error("not text");
    return text;
  } catch {
    throw new Error("it is not UTF-8 text");
  }
}

export function App({ services: injected }: { services?: AppServices }): ReactElement {
  const [services] = useState(() => injected ?? createServices());
  const [state, dispatch, getState] = useStore(() =>
    createInitialState(loadSettings(services.storage, { ...DEFAULT_SETTINGS, reduceMotion: prefersReducedMotion() })),
  );
  const [announcer] = useState(createAnnouncer);
  const [speaker] = useState(() => services.createSpeaker());
  const [dialog, setDialog] = useState<DialogName | null>(() => (getState().settings.dontShowWelcome ? null : "welcome"));
  const [focusRequest, setFocusRequest] = useState(0);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const keysRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const ui = useMemo<UiBridge>(() => ({
    say: announcer.say,
    alert: announcer.alert,
    clearAlert: announcer.clearAlert,
    focusTree: () => setFocusRequest((n) => n + 1),
    focusEditor: (offset) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      editor.setSelectionRange(offset, offset);
      const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 20;
      const line = editor.value.slice(0, offset).split("\n").length - 1;
      editor.scrollTop = Math.max(0, line * lineHeight - editor.clientHeight / 2);
    },
    focusKeys: () => {
      keysRef.current?.focus();
      keysRef.current?.scrollIntoView?.({ block: "start" });
    },
    openDialog: setDialog,
  }), [announcer]);

  const audio = useMemo(() => createAudio(services, {
    volume: () => getState().settings.volume,
    onPlaying: (playing, lastSound) => dispatch({ type: "audio", playing, lastSound }),
    onFailure: () => announcer.say(AUDIO_FAILED_MESSAGE),
  }), [services, getState, dispatch, announcer]);

  const commands = useMemo(
    () => createCommands({ services, getState, dispatch, ui, audio, speaker }),
    [services, getState, dispatch, ui, audio, speaker],
  );

  useEffect(() => {
    let previous = "";
    const stop = services.onRuntimeStatus((runtime) => {
      dispatch({ type: "runtimeChanged", runtime });
      if (runtime === "ready" && previous !== "ready") announcer.say("Python is ready");
      if (runtime === "failed" && previous !== "failed") announcer.say("Python: unavailable");
      previous = runtime;
    });
    services.preloadRuntime();
    return stop;
  }, [services, dispatch, announcer]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme;
    root.dataset.reduceMotion = String(state.settings.reduceMotion);
  }, [state.settings.theme, state.settings.reduceMotion]);

  useEffect(() => {
    speaker.setEnabled(state.settings.speech);
    speaker.setRate(state.settings.speechRate);
  }, [speaker, state.settings.speech, state.settings.speechRate]);

  useEffect(() => saveSettings(services.storage, state.settings), [services, state.settings]);

  useEffect(() => {
    if (focusRequest === 0) return;
    focusTreeItem(document, getState().nav.focusId);
  }, [focusRequest, getState]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isStopAudioKey(event)) commands.stopAudio();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [commands]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handlers: Handlers = {
    onEdit: (source) => {
      dispatch({ type: "sourceEdited", source });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void commands.editSettled(source), DEBOUNCE_MS);
    },
    onRun: () => void commands.run(),
    onOpenFile: (file) => {
      readUtf8(file).then(
        (text) => commands.openSource(file.name, text),
        (error: Error) => announcer.say(openFailedMessage(file.name, error.message)),
      );
    },
    onLoadExample: () => {
      clearTimeout(timer.current);
      void commands.loadExample();
    },
    onKeyCommand: (command) => commands.keyCommand(command),
    onItemFocus: (focusId) => dispatch({ type: "navigated", nav: { ...getState().nav, focusId } }),
    onMove: (action) => {
      void commands.guard(() => commands.move(action));
      ui.focusTree();
    },
    onAction: (name: ActionName) => {
      void commands.guard(() => runAction(name));
      if (name !== "stopAudio" && name !== "promptGoToLine" && name !== "showLegend" && name !== "showKeys") ui.focusTree();
    },
    onHearAgain: () => void commands.guard(commands.repeatNarration),
    onGoToLine: commands.submitGoToLine,
    onCancelGoToLine: commands.closeGoToLine,
  };

  function runAction(name: ActionName): void {
    if (name === "showLegend") setDialog("legend");
    else if (name === "showKeys") ui.focusKeys();
    else commands[name]();
  }

  const closeDialog = (): void => setDialog(null);
  const settings = state.settings;

  return (
    <>
      <a className="skip" href="#structure-heading" onClick={(e) => { e.preventDefault(); ui.focusTree(); }}>
        Skip to structure tree
      </a>
      <header>
        <h1>
          <svg className="ghost" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="28" height="28">
            <path d="M12 2C7.6 2 4 5.6 4 10v11l2.7-2 2.6 2 2.7-2 2.7 2 2.6-2L20 21V10c0-4.4-3.6-8-8-8z" />
            <circle cx="9" cy="10" r="1.6" className="ghost-eye" />
            <circle cx="15" cy="10" r="1.6" className="ghost-eye" />
          </svg>
          Sonic Debugger
        </h1>
        <button type="button" onClick={() => setDialog("settings")}>Settings</button>
      </header>
      <main>
        <EditorPanel state={state} handlers={handlers} editorRef={editorRef} politeRef={announcer.politeRef} />
        <StructurePanel state={state} handlers={handlers} />
        <OutputPanel state={state} handlers={handlers} alertRef={announcer.alertRef} />
      </main>
      <footer>
        <a href="#keys-heading" onClick={(e) => { e.preventDefault(); ui.focusKeys(); }}>Keyboard shortcuts</a>
      </footer>
      <KeysSection headingRef={keysRef} />
      <WelcomeDialog
        open={dialog === "welcome"} onClose={closeDialog} dontShow={settings.dontShowWelcome}
        onDontShow={(dontShowWelcome) => dispatch({ type: "settingsChanged", settings: { dontShowWelcome } })}
      />
      <LegendDialog open={dialog === "legend"} onClose={closeDialog} services={services} onPlay={commands.playLegend} />
      <SettingsDialog
        open={dialog === "settings"} onClose={closeDialog} settings={settings} speechSupported={speaker.supported}
        onChange={(settings) => dispatch({ type: "settingsChanged", settings })}
      />
    </>
  );
}
