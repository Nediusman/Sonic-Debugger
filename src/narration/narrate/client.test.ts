import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRequestBody, codeWindow, fetchModelAnswer } from "./client";

const error = { type: "NameError", message: "name 'x' is not defined", frames: [{ file: "main.py", line: 3, fn: "<module>" }] };
const good = { summary: "A name is missing.", location: "ignored", cause: "It is likely misspelled.", suggestedFix: "Define it.", extra: 1 };

function reply(body: unknown, init?: ResponseInit): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), init);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("codeWindow", () => {
  const source = Array.from({ length: 30 }, (_, i) => `line${i + 1}`).join("\n");
  it("sends the failing line and 5 lines each side (E-24)", () => {
    const lines = codeWindow(source, 15);
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("line10");
    expect(lines[10]).toBe("line20");
  });
  it("clamps at the file edges", () => {
    expect(codeWindow(source, 1)).toHaveLength(6);
    expect(codeWindow(source, 30)).toHaveLength(6);
    expect(codeWindow(source, 500)).toEqual([]);
  });
  it("cuts long lines to 200 characters and sends nothing without a line", () => {
    expect(codeWindow("x".repeat(500), 1)[0]).toHaveLength(200);
    expect(codeWindow(source, null)).toEqual([]);
  });
  it("never sends the whole source of a large file", () => {
    const big = Array.from({ length: 1000 }, (_, i) => `v${i}`).join("\n");
    expect(JSON.parse(buildRequestBody(error, big, 500)).snippet).toHaveLength(11);
  });
});

describe("buildRequestBody", () => {
  it("limits type, message and frame count", () => {
    const frames = Array.from({ length: 50 }, (_, i) => ({ file: "main.py", line: i + 1, fn: "f" }));
    const body = JSON.parse(buildRequestBody({ type: "T".repeat(999), message: "m".repeat(999), frames }, "a", 1));
    expect(body.errorType).toHaveLength(200);
    expect(body.message).toHaveLength(500);
    expect(body.frames).toHaveLength(20);
    expect(Object.keys(body).sort()).toEqual(["errorType", "frames", "message", "snippet"]);
  });
});

describe("fetchModelAnswer", () => {
  it("returns a checked answer and drops extra fields (E-25)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(good));
    vi.stubGlobal("fetch", fetchMock);
    const answer = await fetchModelAnswer(error, "x", 3);
    expect(answer).toEqual({ summary: "A name is missing.", cause: "It is likely misspelled.", suggestedFix: "Define it." });
    expect(fetchMock).toHaveBeenCalledWith("/api/narrate", expect.objectContaining({ method: "POST" }));
  });
  it("sanitises and truncates", async () => {
    const long = Array.from({ length: 80 }, (_, i) => `w${i}`).join(" ");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ summary: "**Bold** `code`\nline", cause: long, suggestedFix: "ok" })));
    const answer = await fetchModelAnswer(error, "x", 3);
    expect(answer?.summary).toBe("Bold code line");
    expect(answer?.cause.split(" ")).toHaveLength(30);
  });
  it.each([
    ["network error", () => Promise.reject(new Error("down"))],
    ["500", () => Promise.resolve(reply({ error: "x" }, { status: 500 }))],
    ["429", () => Promise.resolve(reply({ error: "x" }, { status: 429 }))],
    ["bad JSON", () => Promise.resolve(reply("not json"))],
    ["array", () => Promise.resolve(reply([1]))],
    ["missing field", () => Promise.resolve(reply({ summary: "a", cause: "b" }))],
    ["empty field", () => Promise.resolve(reply({ summary: "a", cause: "  ", suggestedFix: "c" }))],
    ["non-string field", () => Promise.resolve(reply({ summary: 1, cause: "b", suggestedFix: "c" }))],
    ["only symbols", () => Promise.resolve(reply({ summary: "```", cause: "b", suggestedFix: "c" }))],
    ["huge body", () => Promise.resolve(reply({ summary: "a".repeat(30000), cause: "b", suggestedFix: "c" }))],
  ])("falls back (null) on %s", async (_, impl) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
    expect(await fetchModelAnswer(error, "x", 3)).toBeNull();
  });
  it("gives up after 5 seconds and aborts the request (E-23)", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise(() => undefined);
    }));
    const pending = fetchModelAnswer(error, "x", 3);
    await vi.advanceTimersByTimeAsync(4999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeNull();
    expect(signal?.aborted).toBe(true);
  });
  it("leaves no timer behind after an answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(good)));
    await fetchModelAnswer(error, "x", 3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("falls back when fetch does not exist (E-30)", async () => {
    vi.stubGlobal("fetch", undefined);
    expect(await fetchModelAnswer(error, "x", 3)).toBeNull();
  });
});
