import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REALISTIC, failingRun, frame } from "../fixtures/runs";
import { SOURCE_12, narrationTree } from "../fixtures/trees";
import { narrate } from "./narrate";

const model = { summary: "A name is missing.", location: "Somewhere else entirely.", cause: "It is likely misspelled.", suggestedFix: "Define it first." };
const run = failingRun("NameError", "name 'total' is not defined", [frame(12, "<module>"), frame(11, "main"), frame(4, "process")]);

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("narrate", () => {
  it("returns the success result without any network call (E-14)", async () => {
    const result = await narrate({ ok: true, source: SOURCE_12, stdout: "hi" }, narrationTree);
    expect(result).toEqual({
      summary: "The program finished without errors.",
      location: "", cause: "", suggestedFix: "", nodeId: "r", offline: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the offline result when the network fails (E-20)", async () => {
    const result = await narrate(run, narrationTree);
    expect(result).toEqual({
      summary: "A name was used that does not exist.",
      location: "line 4, in process",
      cause: "The name total is likely misspelled or not defined before line 4 uses it.",
      suggestedFix: "Check the spelling of total, or define it before line 4.",
      nodeId: "c",
      offline: true,
    });
  });

  it("uses the model answer but takes location and node from the run (E-26)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(model)));
    const result = await narrate(run, narrationTree);
    expect(result.offline).toBe(false);
    expect(result.summary).toBe("A name is missing.");
    expect(result.location).toBe("line 4, in process");
    expect(result.nodeId).toBe("c");
  });

  it("sends only a window of the source", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(model)));
    const source = Array.from({ length: 200 }, (_, i) => `row${i + 1} = 1`).join("\n");
    const tree = { ...narrationTree, nodes: { r: { ...narrationTree.nodes.r, endLine: 200, childIds: [] } } };
    await narrate(failingRun("ValueError", "bad", [frame(100, "<module>")], source), tree);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.snippet).toHaveLength(11);
    expect(JSON.stringify(sent)).not.toContain("row1 =");
  });

  it.each(Object.entries(REALISTIC))("gives non-silent offline output for %s", async (type, message) => {
    const result = await narrate(failingRun(type, message, [frame(4, "process")]), narrationTree);
    expect(result.offline).toBe(true);
    for (const key of ["summary", "location", "cause", "suggestedFix"] as const) expect(result[key]).not.toBe("");
    expect(Object.keys(narrationTree.nodes)).toContain(result.nodeId);
  });

  it("handles an error with no frames and a failing run with no error object", async () => {
    const noFrames = await narrate(failingRun("TimeoutError", "x", []), narrationTree);
    expect(noFrames.location).toBe("the program as a whole");
    expect(noFrames.nodeId).toBe("r");
    const noError = await narrate({ ok: false, source: "", stdout: "" }, narrationTree);
    expect(noError.summary).not.toBe("");
    expect(noError.offline).toBe(true);
  });

  it("never rejects on malformed input", async () => {
    const bad = { ok: false, source: 1, stdout: 2, error: { type: 3, message: null, frames: "x" } };
    await expect(narrate(bad as never, narrationTree)).resolves.toMatchObject({ offline: true });
    await expect(narrate(null as never, narrationTree)).resolves.toMatchObject({ offline: true });
  });
});
