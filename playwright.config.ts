import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const system = "/usr/bin/chromium";
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(system) ? system : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5173", launchOptions: { executablePath } },
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 5173", url: "http://127.0.0.1:5173", reuseExistingServer: true },
});
