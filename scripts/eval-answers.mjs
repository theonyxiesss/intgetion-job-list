import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// The key stays in the child process environment and never enters command text.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "vitest",
    "run",
    "src/modules/bot/__tests__/answer-eval-live.test.ts",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, ANSWER_QUALITY_LIVE: "1" },
    shell: true,
  },
);
process.exit(result.status ?? 1);
