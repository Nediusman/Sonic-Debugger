import type { SoundEvent } from "../../shared/types";
import { FADE_S, MAX_GAIN, synthTable, type Synth } from "./synthTable";
export interface Voice {
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
}
function peakOf(event: SoundEvent): number {
  return Number.isFinite(event.gain) ? Math.min(MAX_GAIN, Math.max(0, event.gain)) : 0;
}
function envelope(param: AudioParam, synth: Synth, peak: number, start: number, dur: number): void {
  const attack = Math.min(Math.max(synth.attack, FADE_S), dur / 2);
  const release = Math.min(Math.max(synth.release, FADE_S), dur - attack);
  param.setValueAtTime(0, start);
  param.linearRampToValueAtTime(peak, start + attack);
  if (synth.decay !== undefined) {
    param.linearRampToValueAtTime(0, start + attack + Math.min(synth.decay, dur - attack));
    return;
  }
  param.setValueAtTime(peak, start + dur - release);
  param.linearRampToValueAtTime(0, start + dur);
}
function addLfo(ctx: AudioContext, voice: Voice, hz: number, depth: number, target: AudioParam, start: number, stop: number): void {
  const lfo = ctx.createOscillator();
  const amount = ctx.createGain();
  lfo.frequency.setValueAtTime(hz, start);
  amount.gain.setValueAtTime(depth, start);
  lfo.connect(amount);
  amount.connect(target);
  lfo.start(start);
  lfo.stop(stop);
  voice.oscillators.push(lfo);
  voice.nodes.push(lfo, amount);
}
/** Builds and schedules the node graph for one event at audio time `start` for `dur` seconds. */
export function scheduleVoice(ctx: AudioContext, event: SoundEvent, start: number, dur: number): Voice {
  const synth = synthTable[event.timbre];
  const voice: Voice = { oscillators: [], nodes: [] };
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const panner = ctx.createStereoPanner();
  osc.type = synth.wave;
  osc.frequency.setValueAtTime(event.frequencyHz, start);
  panner.pan.setValueAtTime(event.stereoPan, start);
  envelope(env.gain, synth, peakOf(event), start, dur);
  let tail: AudioNode = osc;
  if (synth.lowpassHz !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(synth.lowpassHz, start);
    osc.connect(filter);
    voice.nodes.push(filter);
    tail = filter;
  }
  tail.connect(env);
  voice.oscillators.push(osc);
  voice.nodes.push(osc, env, panner);
  let out: AudioNode = env;
  if (synth.tremoloHz !== undefined) {
    const trem = ctx.createGain();
    trem.gain.setValueAtTime(0.5, start);
    env.connect(trem);
    addLfo(ctx, voice, synth.tremoloHz, 0.5, trem.gain, start, start + dur);
    voice.nodes.push(trem);
    out = trem;
  }
  if (synth.vibratoHz !== undefined) addLfo(ctx, voice, synth.vibratoHz, synth.vibratoCents ?? 0, osc.detune, start, start + dur);
  out.connect(panner);
  panner.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
  return voice;
}
function safely(action: () => void): void {
  try {
    action();
  } catch {
    // Node already stopped or disconnected: nothing left to release.
  }
}
/** Stops and disconnects every node of a voice. Never throws. */
export function disposeVoice(voice: Voice): void {
  voice.oscillators.forEach((o) => safely(() => o.stop()));
  voice.nodes.forEach((n) => safely(() => n.disconnect()));
}
