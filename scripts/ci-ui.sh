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
# so the 2500 ms budget applies to the median of five runs (D41, D145).
# Chrome on the runner sometimes exits before the debugging port is ready; retry once.
lh() {
  local out="$1"
  shift
  local attempt
  for attempt in 1 2; do
    if pnpm dlx lighthouse@12.8.2 "$@" \
      --quiet \
      --chrome-path="$chrome" \
      --only-categories=performance \
      --output=json \
      --output-path="$out" \
      --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"; then
      return 0
    fi
    echo "lighthouse failed (attempt ${attempt}): ${out}" >&2
    sleep 3
  done
  return 1
}

for run in 1 2 3 4 5; do
  lh "/tmp/lh-${run}.json" "http://127.0.0.1:3000/en"
done

node --input-type=module <<'EOF'
import fs from "node:fs";

const runs = [1, 2, 3, 4, 5].map((run) => {
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
const median = [...runs].sort((a, b) => a - b)[Math.floor(runs.length / 2)];
console.log(`lcp_ms ${median} (median of ${runs.length})`);
if (!(median < 2500)) process.exit(1);
EOF

# Catalog and one job, mobile form factor, five-run median (D288).
# 4500 ms is the first ceiling: the homepage's worst recent run was 2489,
# and these pages are heavier. Tighten only after a measured median.
job_path="$(curl -sf "http://127.0.0.1:3000/en/jobs" | grep -oE '/en/jobs/[0-9a-f-]{36}' | head -n 1 || true)"
if [[ -z "$job_path" ]]; then
  echo "no public job to measure" >&2
  exit 1
fi

measure_mobile() {
  local name="$1"
  local url="$2"
  for run in 1 2 3 4 5; do
    lh "/tmp/lh-${name}-${run}.json" "$url" --form-factor=mobile
  done
  NAME="$name" node --input-type=module <<'EOF'
import fs from "node:fs";

const name = process.env.NAME;
const runs = [1, 2, 3, 4, 5].map((run) => {
  const report = JSON.parse(fs.readFileSync(`/tmp/lh-${name}-${run}.json`, "utf8"));
  const lcp = report.audits["largest-contentful-paint"].numericValue;
  console.log(`${name} run ${run}: lcp_ms ${Math.round(lcp)}`);
  return lcp;
});
if (!runs.every((lcp) => typeof lcp === "number")) process.exit(1);
const median = [...runs].sort((a, b) => a - b)[Math.floor(runs.length / 2)];
console.log(`${name} lcp_ms ${median} (median of ${runs.length})`);
if (!(median < 4500)) process.exit(1);
EOF
}

measure_mobile catalog "http://127.0.0.1:3000/en/jobs"
measure_mobile job "http://127.0.0.1:3000${job_path}"
