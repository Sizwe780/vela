import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 40_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:3200",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "chrome" : undefined),
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3200",
    url: "http://localhost:3200/study/demo",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
