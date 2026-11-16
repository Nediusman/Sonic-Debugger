import { handleNarrate } from "../src/narration/route/handler";
import { createChatClient } from "../src/narration/route/model";
import { createRateLimiter } from "../src/narration/route/rateLimit";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  end(): void;
}

const limiter = createRateLimiter(10, 60_000);

function header(req: ApiRequest, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function clientKey(req: ApiRequest): string {
  const forwarded = header(req, "x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function bodyText(body: unknown): string | null {
  if (typeof body === "string") return body;
  return body === undefined || body === null ? null : JSON.stringify(body);
}

function allowOrigin(res: ApiResponse): void {
  const origin = process.env.ALLOWED_ORIGIN;
  if (!origin) return;
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("vary", "origin");
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  allowOrigin(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const output = await handleNarrate(
    { method: req.method ?? "", bodyText: bodyText(req.body), clientKey: clientKey(req) },
    { callModel: createChatClient(process.env), limiter },
  );
  res.status(output.status).json(output.body);
}
