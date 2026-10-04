import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "src/modules/bot/__tests__/eval-live.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, EVAL_LIVE: "1" },
    shell: true,
  },
);

process.exit(result.status ?? 1);
