#!/usr/bin/env bash
# Runs after scripts/ci-db.sh has started Supabase and built the app.
set -euo pipefail

pnpm exec playwright install --with-deps chromium
pnpm test:e2e

pnpm start > /tmp/next-start.log 2>&1 &
server_pid=$!

cleanup() {
  kill "$server_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:3000/en"; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  echo "production server did not serve /en" >&2
  cat /tmp/next-start.log >&2 || true
  exit 1
fi

health="$(curl -sf "http://127.0.0.1:3000/api/health")"
echo "$health"
if [[ "$health" != '{"ok":true}' ]]; then
  echo "GET /api/health did not return ok" >&2
  exit 1
fi

chrome="$(find "${HOME}/.cache/ms-playwright" -type f -name chrome | head -n 1)"
if [[ -z "$chrome" ]]; then
  echo "playwright chrome was not found" >&2
  exit 1
fi

# Simulated LCP on a shared runner swings by several hundred ms between runs,
# so the 2500 ms budget applies to the median of three runs (D41).
for run in 1 2 3; do
  pnpm dlx lighthouse@12.8.2 "http://127.0.0.1:3000/en" \
    --quiet \
    --chrome-path="$chrome" \
    --only-categories=performance \
    --output=json \
    --output-path="/tmp/lh-${run}.json" \
    --chrome-flags="--headless --no-sandbox"
done

node --input-type=module <<'EOF'
import fs from "node:fs";

const runs = [1, 2, 3].map((run) => {
  const report = JSON.parse(fs.readFileSync(`/tmp/lh-${run}.json`, "utf8"));
  const lcp = report.audits["largest-contentful-paint"].numericValue;
  const fcp = report.audits["first-contentful-paint"].numericValue;
  console.log(`run ${run}: lcp_ms ${Math.round(lcp)} fcp_ms ${Math.round(fcp)}`);
  // Which element is the LCP and where its time goes, to debug the budget.
  const element = report.audits["largest-contentful-paint-element"]?.details?.items ?? [];
  for (const table of element) {
    for (const item of table.items ?? []) {
      if (item.node?.snippet) console.log(`  lcp element: ${item.node.snippet.slice(0, 160)}`);
      if (item.phase) console.log(`  ${item.phase}: ${Math.round(item.timing)} ms`);
    }
  }
  return lcp;
});
if (!runs.every((lcp) => typeof lcp === "number")) process.exit(1);
const median = [...runs].sort((a, b) => a - b)[1];
console.log(`lcp_ms ${median} (median of ${runs.length})`);
if (!(median < 2500)) process.exit(1);
EOF
