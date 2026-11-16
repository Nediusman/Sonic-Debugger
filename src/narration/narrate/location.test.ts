import { describe, expect, it } from "vitest";
import { frame } from "../fixtures/runs";
import { narrationTree } from "../fixtures/trees";
import { locate } from "./location";

const err = (frames: ReturnType<typeof frame>[]) => ({ type: "X", message: "", frames });

describe("locate", () => {
  it("uses the innermost frame and the deepest node (E-18)", () => {
    const result = locate(err([frame(11, "main"), frame(4, "process")]), narrationTree);
    expect(result).toEqual({ location: "line 4, in process", nodeId: "c", line: 4 });
  });
  it("words module-level frames as the top level of the file", () => {
    const result = locate(err([frame(12, "<module>")]), narrationTree);
    expect(result.location).toBe("line 12, at the top level of the file");
    expect(result.nodeId).toBe("m");
  });
  it("falls back to the root when the line is outside the tree", () => {
    const result = locate(err([frame(99, "f")]), narrationTree);
    expect(result.nodeId).toBe("r");
    expect(result.location).toBe("line 99, in f");
  });
  it("describes the whole program when there are no frames (E-19)", () => {
    expect(locate(err([]), narrationTree)).toEqual({ location: "the program as a whole", nodeId: "r", line: null });
    expect(locate(undefined, narrationTree).nodeId).toBe("r");
  });
  it("skips frames with unusable lines", () => {
    const result = locate(err([frame(4, "process"), frame(Number.NaN, "x")]), narrationTree);
    expect(result.line).toBe(4);
  });
  it("makes function names speech-ready", () => {
    expect(locate(err([frame(3, "<lambda>")]), narrationTree).location).toBe("line 3, in lambda");
    expect(locate(err([frame(3, "<>")]), narrationTree).location).toBe("line 3");
  });
});
