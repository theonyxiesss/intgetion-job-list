import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// D522: the live routing check on a free OpenRouter model. The key is read
// from .env.local by Node itself and never passes through the shell.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "src/modules/bot/__tests__/routing-live.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, ROUTING_LIVE: "1" },
    shell: true,
  },
);
process.exit(result.status ?? 1);
