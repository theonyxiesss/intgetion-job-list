#!/usr/bin/env bash
set -euo pipefail

supabase start
supabase db reset --yes

db_url="$(supabase status -o env | sed -n 's/^DB_URL=//p' | tr -d '"')"
if [[ -z "$db_url" ]]; then
  echo "supabase status did not return DB_URL" >&2
  exit 1
fi

export DATABASE_MIGRATION_URL="$db_url"
pnpm db:migrate
pnpm db:migrate
pnpm db:verify

app_url="${db_url/postgres:postgres@/app_rw:app_rw_local_only@}"
export DATABASE_URL="$app_url"
pnpm test:integration
pnpm build
pnpm start > /tmp/next-start.log 2>&1 &
server_pid=$!

cleanup() {
  kill "$server_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:3000/api/health"; then
    echo
    exit 0
  fi
  sleep 1
done

echo "GET /api/health did not return ok" >&2
cat /tmp/next-start.log >&2 || true
exit 1
