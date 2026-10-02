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

pnpm dlx lighthouse@12.8.2 "http://127.0.0.1:3000/en" \
  --quiet \
  --chrome-path="$chrome" \
  --only-categories=performance \
  --output=json \
  --output-path=/tmp/lh.json \
  --chrome-flags="--headless --no-sandbox"

node --input-type=module <<'EOF'
import fs from "node:fs";

const report = JSON.parse(fs.readFileSync("/tmp/lh.json", "utf8"));
const lcp = report.audits["largest-contentful-paint"].numericValue;
console.log(`lcp_ms ${lcp}`);
if (!(typeof lcp === "number" && lcp < 2500)) process.exit(1);
EOF
