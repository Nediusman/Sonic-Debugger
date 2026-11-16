import type { ReactElement } from "react";
import { Dialog } from "./Dialog";
import { legendRows } from "./legend";
import type { AppServices } from "./services";
import type { Settings, ThemeName } from "./state";

interface Common {
  open: boolean;
  onClose(): void;
}

export function WelcomeDialog(props: Common & { dontShow: boolean; onDontShow(on: boolean): void }): ReactElement {
  return (
    <Dialog open={props.open} title="Welcome to Sonic Debugger" onClose={props.onClose}>
      <ol>
        <li>
          What this tool does: you open or type Python code, hear its structure as sound, run it, and hear
          where and why it failed. It works with the keyboard alone.
        </li>
        <li>
          The six keys that matter, when the structure tree has focus: R runs the code, P plays the overview,
          E jumps to the error, S stops all sound, G goes to a line, L opens the sound legend.
        </li>
        <li>To open the legend, press L in the structure tree, or use the Legend (L) button.</li>
      </ol>
      <p>
        <label>
          <input type="checkbox" checked={props.dontShow} onChange={(e) => props.onDontShow(e.target.checked)} />{" "}
          Don&apos;t show again
        </label>
      </p>
      <button type="button" onClick={props.onClose}>Close</button>
    </Dialog>
  );
}

export function LegendDialog(props: Common & { services: AppServices; onPlay(nodeId: string): void }): ReactElement {
  return (
    <Dialog open={props.open} title="Sound legend" onClose={props.onClose}>
      <table>
        <thead>
          <tr><th scope="col">Construct</th><th scope="col">Sound</th><th scope="col">Play</th></tr>
        </thead>
        <tbody>
          {legendRows(props.services).map((row) => (
            <tr key={row.kind}>
              <th scope="row">{row.kind}</th>
              <td>{row.text}</td>
              <td>
                <button type="button" aria-label={`Play ${row.kind} sound`} onClick={() => props.onPlay(row.nodeId)}>
                  Play
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={props.onClose}>Close</button>
    </Dialog>
  );
}

interface SettingsProps extends Common {
  settings: Settings;
  speechSupported: boolean;
  onChange(change: Partial<Settings>): void;
}

function Check(props: { label: string; checked: boolean; disabled?: boolean; onChange(on: boolean): void }): ReactElement {
  return (
    <p>
      <label>
        <input
          type="checkbox"
          checked={props.checked}
          disabled={props.disabled}
          onChange={(e) => props.onChange(e.target.checked)}
        />{" "}
        {props.label}
      </label>
    </p>
  );
}

function Slider(props: {
  label: string; value: number; min: number; max: number; step: number; text: string; onChange(v: number): void;
}): ReactElement {
  return (
    <p>
      <label>
        {props.label}{" "}
        <input
          type="range" min={props.min} max={props.max} step={props.step} value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
      </label>{" "}
      <output>{props.text}</output>
    </p>
  );
}

export function SettingsDialog({ settings, speechSupported, onChange, ...common }: SettingsProps): ReactElement {
  return (
    <Dialog open={common.open} title="Settings" onClose={common.onClose}>
      <Slider
        label="Volume" min={0} max={1} step={0.05} value={settings.volume}
        text={`${Math.round(settings.volume * 100)} percent`} onChange={(volume) => onChange({ volume })}
      />
      <Check label="Reduced sound" checked={settings.reducedSound} onChange={(reducedSound) => onChange({ reducedSound })} />
      <Check
        label={speechSupported ? "Speech" : "Speech (not supported in this browser)"}
        checked={settings.speech} disabled={!speechSupported} onChange={(speech) => onChange({ speech })}
      />
      <Slider
        label="Speech rate" min={0.5} max={2} step={0.1} value={settings.speechRate}
        text={`${settings.speechRate.toFixed(1)} times`} onChange={(speechRate) => onChange({ speechRate })}
      />
      <p>
        <label>
          Theme{" "}
          <select value={settings.theme} onChange={(e) => onChange({ theme: e.target.value as ThemeName })}>
            <option value="default">Default</option>
            <option value="high-contrast">High contrast</option>
          </select>
        </label>
      </p>
      <Check label="Reduce motion" checked={settings.reduceMotion} onChange={(reduceMotion) => onChange({ reduceMotion })} />
      <button type="button" onClick={common.onClose}>Close</button>
    </Dialog>
  );
}
