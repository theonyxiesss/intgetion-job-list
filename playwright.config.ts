import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.CI
    ? [
        {
          command: "pnpm start",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: false,
        },
        {
          command: "pnpm start --port 3100",
          url: "http://127.0.0.1:3100",
          reuseExistingServer: false,
          env: { ...process.env, ADMIN_HOST_ONLY: "1", PORT: "3100" },
        },
      ]
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
