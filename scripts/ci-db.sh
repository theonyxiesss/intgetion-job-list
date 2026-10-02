#!/usr/bin/env bash
set -euo pipefail

supabase start
supabase db reset --yes

status_env="$(supabase status -o env)"
echo "supabase status keys: $(printf '%s\n' "$status_env" | sed 's/=.*//' | tr '\n' ' ')"
value() {
  printf '%s\n' "$status_env" | sed -n "s/^$1=//p" | tr -d '"'
}

db_url="$(value DB_URL)"
if [[ -z "$db_url" ]]; then
  echo "supabase status did not return DB_URL" >&2
  exit 1
fi

export DATABASE_MIGRATION_URL="$db_url"
export DATABASE_URL="${db_url/postgres:postgres@/app_rw:app_rw_local_only@}"
pnpm db:migrate
pnpm db:migrate
pnpm db:verify
pnpm test:integration

# Auth for the app and the e2e run (1A). NEXT_PUBLIC_* are inlined at build time.
export NEXT_PUBLIC_SUPABASE_URL="$(value API_URL)"
anon_key="$(value ANON_KEY)"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${anon_key:-$(value PUBLISHABLE_KEY)}"
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000"
mail_url="$(value MAILPIT_URL)"
mail_url="${mail_url:-$(value INBUCKET_URL)}"
export MAILPIT_URL="${mail_url:-http://127.0.0.1:54324}"
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
  echo "supabase status did not return API_URL and an anon key" >&2
  exit 1
fi

pnpm build
bash scripts/ci-ui.sh
