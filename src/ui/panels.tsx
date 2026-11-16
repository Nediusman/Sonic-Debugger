import { useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement, RefObject } from "react";
import { StructureTree, type KeyCommand, type NavAction } from "../navigation";
import { countLines, type AppState, type RuntimeState } from "./state";
import { KEY_ROWS } from "./keysList";

export interface Handlers {
  onEdit(source: string): void;
  onRun(): void;
  onOpenFile(file: File): void;
  onLoadExample(): void;
  onKeyCommand(command: KeyCommand): void;
  onItemFocus(nodeId: string): void;
  onMove(action: NavAction): void;
  onAction(name: ActionName): void;
  onHearAgain(): void;
  onGoToLine(input: string): void;
  onCancelGoToLine(): void;
}

export type ActionName =
  | "playOverview" | "playFocus" | "goToError" | "promptGoToLine" | "stopAudio"
  | "showLegend" | "showKeys" | "toggleSpeech" | "toggleReducedSound";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function EditorPanel(props: { state: AppState; handlers: Handlers; editorRef: RefObject<HTMLTextAreaElement | null>; politeRef: RefObject<HTMLElement | null> }): ReactElement {
  const { state, handlers, editorRef, politeRef } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const issues = state.tree.issues;
  const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handlers.onOpenFile(file);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.code === "Enter" && event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      handlers.onRun();
    }
  };
  return (
    <section aria-labelledby="editor-h" className="editor">
      <h2 id="editor-h">Editor</h2>
      <div className="row">
        <button type="button" onClick={() => fileRef.current?.click()}>Open Python file</button>
        <button type="button" onClick={handlers.onLoadExample}>Load an example with a bug</button>
        <input ref={fileRef} type="file" accept=".py,text/x-python" hidden onChange={onFile} />
      </div>
      <label htmlFor="code">Python code</label>
      <textarea
        id="code" ref={editorRef} value={state.source} rows={14}
        spellCheck={false} autoComplete="off" autoCapitalize="off" autoCorrect="off" wrap="off"
        onChange={(e) => handlers.onEdit(e.target.value)} onKeyDown={onKeyDown}
      />
      <p className="muted">{plural(countLines(state.source), "line")}</p>
      {issues.length > 0 ? (
        <ul aria-label="Syntax issues">
          {issues.map((issue) => (
            <li key={`${issue.line}:${issue.column}:${issue.message}`}>
              Line {issue.line}, column {issue.column}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="row">
        <button type="button" className="primary" aria-keyshortcuts="R" onClick={handlers.onRun}>Run (R)</button>
      </div>
      <p>
        Status: <span role="status" aria-atomic="true" ref={politeRef} />
      </p>
    </section>
  );
}

interface ButtonSpec { label: string; keys?: string; action: NavAction }

const MOVES: readonly ButtonSpec[] = [
  { label: "Next", keys: "ArrowDown", action: { type: "next" } },
  { label: "Previous", keys: "ArrowUp", action: { type: "previous" } },
  { label: "Expand", keys: "ArrowRight", action: { type: "expand" } },
  { label: "Collapse", keys: "ArrowLeft", action: { type: "collapse" } },
  { label: "Parent", action: { type: "parentNode" } },
  { label: "First child", action: { type: "firstChildNode" } },
  { label: "First", keys: "Home", action: { type: "first" } },
  { label: "Last", keys: "End", action: { type: "last" } },
];

interface ActionSpec { label: string; keys: string; name: ActionName }

function actionButtons(state: AppState): ActionSpec[] {
  const { speech, reducedSound } = state.settings;
  return [
    { label: "Play overview (P)", keys: "P", name: "playOverview" },
    { label: "Play this construct (F)", keys: "F", name: "playFocus" },
    { label: "Jump to error (E)", keys: "E", name: "goToError" },
    { label: "Go to line (G)", keys: "G", name: "promptGoToLine" },
    { label: "Stop (S)", keys: "S Escape", name: "stopAudio" },
    { label: "Legend (L)", keys: "L", name: "showLegend" },
    { label: "Keys (?)", keys: "Shift+Slash", name: "showKeys" },
    { label: `Speech: ${speech ? "on" : "off"} (T)`, keys: "T", name: "toggleSpeech" },
    { label: `Reduced sound: ${reducedSound ? "on" : "off"} (M)`, keys: "M", name: "toggleReducedSound" },
  ];
}

function GoToLineForm(props: { open: boolean; onSubmit(input: string): void; onCancel(): void }): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (props.open) inputRef.current?.focus();
  }, [props.open]);
  const cancelOnEscape = (event: KeyboardEvent): void => {
    if (event.code === "Escape") props.onCancel();
  };
  return (
    <form
      hidden={!props.open}
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit(inputRef.current?.value ?? "");
      }}
    >
      <label htmlFor="line-number">Line number</label>{" "}
      <input id="line-number" ref={inputRef} type="text" inputMode="numeric" autoComplete="off" onKeyDown={cancelOnEscape} />{" "}
      <button type="submit" onKeyDown={cancelOnEscape}>Go</button>
    </form>
  );
}

export function StructurePanel(props: { state: AppState; handlers: Handlers }): ReactElement {
  const { state, handlers } = props;
  return (
    <section aria-labelledby="structure-heading" className="structure">
      <h2 id="structure-heading" tabIndex={-1}>Structure</h2>
      <StructureTree
        tree={state.tree} state={state.nav}
        onKeyCommand={(command) => handlers.onKeyCommand(command)}
        onItemFocus={handlers.onItemFocus}
      />
      <div role="group" aria-label="Move" className="row">
        {MOVES.map((m) => (
          <button key={m.label} type="button" aria-keyshortcuts={m.keys} onClick={() => handlers.onMove(m.action)}>
            {m.label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Structure actions" className="row">
        {actionButtons(state).map((a) => (
          <button key={a.name} type="button" aria-keyshortcuts={a.keys} onClick={() => handlers.onAction(a.name)}>
            {a.label}
          </button>
        ))}
      </div>
      <GoToLineForm open={state.goToLineOpen} onSubmit={handlers.onGoToLine} onCancel={handlers.onCancelGoToLine} />
      <p className="muted">Last sound: {state.lastSound || "none yet"}</p>
    </section>
  );
}

const RUNTIME_TEXT: Record<RuntimeState, string> = {
  idle: "Python: not started",
  loading: "Python: loading",
  ready: "Python: ready",
  failed: "Python: unavailable",
};

const STATUS_TEXT: Record<AppState["run"]["status"], string> = {
  idle: "Not run yet",
  running: "Running",
  finished: "Finished, no errors",
  failed: "Error",
};

function Explanation({ state }: { state: AppState }): ReactElement {
  const { narration, status } = state.run;
  if (status === "running") return <p>Running. The explanation will appear here.</p>;
  if (!narration || status === "idle") return <p>No explanation yet. Run the code.</p>;
  if (status === "finished") return <p>No errors to explain.</p>;
  return (
    <>
      {narration.offline ? <p>offline explanation</p> : null}
      <dl>
        <dt>Summary</dt><dd>{narration.summary}</dd>
        <dt>Where</dt><dd>{narration.location}</dd>
        <dt>Why</dt><dd>{narration.cause}</dd>
        <dt>Suggested fix</dt><dd>{narration.suggestedFix}</dd>
      </dl>
    </>
  );
}

function outputText(state: AppState): string {
  const result = state.run.result;
  if (!result) return state.run.status === "running" ? "Running." : "No output yet.";
  return result.stdout === "" ? "No output." : result.stdout;
}

export function OutputPanel(props: { state: AppState; handlers: Handlers; alertRef: RefObject<HTMLElement | null> }): ReactElement {
  const { state, handlers, alertRef } = props;
  return (
    <section aria-labelledby="output-h" className="output">
      <h2 id="output-h">Output</h2>
      <p>{RUNTIME_TEXT[state.runtime]}</p>
      <p>Run status: <strong>{STATUS_TEXT[state.run.status]}</strong></p>
      {/* Focusable so keyboard users can scroll long output (U-18). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre tabIndex={0} aria-label="Program output">{outputText(state)}</pre>
      <Explanation state={state} />
      <div className="row">
        <button type="button" aria-keyshortcuts="N" onClick={handlers.onHearAgain}>Hear it again (N)</button>
      </div>
      <div role="alert" aria-atomic="true" ref={alertRef as RefObject<HTMLDivElement>} className="alert" />
    </section>
  );
}

export function KeysSection({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }): ReactElement {
  return (
    <section id="keys" aria-labelledby="keys-heading">
      <h2 id="keys-heading" tabIndex={-1} ref={headingRef}>Keyboard shortcuts</h2>
      <p>Letter keys work only while the structure tree has focus. Every action is also a button.</p>
      <table>
        <thead>
          <tr><th scope="col">Keys</th><th scope="col">Action</th></tr>
        </thead>
        <tbody>
          {KEY_ROWS.map((row) => (
            <tr key={row.keys}><th scope="row">{row.keys}</th><td>{row.action}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
