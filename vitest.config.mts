import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Letter HTML needs a public origin for the logo. Unit tests have no
    // deployment env; this loopback value does not replace siteUrl()'s check.
    env: {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
    include: ["src/**/*.test.ts", "eslint-rules/**/*.test.mjs"],
    exclude: [
      "tests/e2e/**",
      "node_modules/**",
      ".next/**",
      "**/*.integration.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
