export interface MockParam {
  value: number;
  calls: Array<{ op: string; value: number; time: number }>;
  setValueAtTime(value: number, time: number): MockParam;
  linearRampToValueAtTime(value: number, time: number): MockParam;
}
function param(): MockParam {
  const p: MockParam = {
    value: 0,
    calls: [],
    setValueAtTime(value, time) {
      p.calls.push({ op: "set", value, time });
      return p;
    },
    linearRampToValueAtTime(value, time) {
      p.calls.push({ op: "ramp", value, time });
      return p;
    },
  };
  return p;
}
export class MockNode {
  connected = new Set<MockNode>();
  disconnected = false;
  connect(target: MockNode): MockNode {
    this.connected.add(target);
    return target;
  }
  disconnect(): void {
    this.disconnected = true;
  }
}
export class MockOscillator extends MockNode {
  type = "sine";
  frequency = param();
  detune = param();
  startTime: number | undefined;
  stopTimes: Array<number | undefined> = [];
  start(time: number): void {
    this.startTime = time;
  }
  stop(time?: number): void {
    this.stopTimes.push(time);
  }
}
export class MockGain extends MockNode {
  gain = param();
}
export class MockPanner extends MockNode {
  pan = param();
}
export class MockFilter extends MockNode {
  type = "lowpass";
  frequency = param();
}
/** Records graph construction without real audio. Cast with asContext() to pass to the player. */
export class MockAudioContext {
  currentTime = 0;
  state: "running" | "suspended" | "closed" = "running";
  destination = new MockNode();
  oscillators: MockOscillator[] = [];
  gains: MockGain[] = [];
  panners: MockPanner[] = [];
  filters: MockFilter[] = [];
  resumeCalls = 0;
  suspendCalls = 0;
  createOscillator(): MockOscillator {
    const o = new MockOscillator();
    this.oscillators.push(o);
    return o;
  }
  createGain(): MockGain {
    const g = new MockGain();
    this.gains.push(g);
    return g;
  }
  createStereoPanner(): MockPanner {
    const p = new MockPanner();
    this.panners.push(p);
    return p;
  }
  createBiquadFilter(): MockFilter {
    const f = new MockFilter();
    this.filters.push(f);
    return f;
  }
  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.suspendCalls++;
    this.state = "suspended";
    return Promise.resolve();
  }
  asContext(): AudioContext {
    return this as unknown as AudioContext;
  }
  /** Oscillators not yet disconnected (active or scheduled). */
  activeOscillators(): MockOscillator[] {
    return this.oscillators.filter((o) => !o.disconnected);
  }
}
