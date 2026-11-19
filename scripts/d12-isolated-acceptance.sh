#!/usr/bin/env bash
# Start only a disposable API. All addresses, identities and credentials belong to the fixture.
set -euo pipefail
umask 077
d12_tmp=$(mktemp -d)
pg_bin=''
api_pid=''
cleanup() {
  if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; wait "$api_pid" 2>/dev/null || true; fi
  if [[ -n "$pg_bin" && -f "$d12_tmp/db/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$d12_tmp/db" -m fast -w stop >/dev/null; fi
  rm -rf -- "$d12_tmp"
}
trap cleanup EXIT
export NODE_ENV=test PORT=3197 WEB_ORIGIN=http://127.0.0.1:4197
export D12_OWNER_EMAIL=owner-d12@example.invalid D12_UAT_API=http://127.0.0.1:3197/api/v1/ D12_UAT_BROWSER=1
JWT_SECRET=$(openssl rand -hex 40)
export JWT_SECRET

case "${1:-}" in
  render-build)
    if [[ -n "${DATABASE_URL:-}" ]]; then echo 'The acceptance builder must have no attached database.' >&2; exit 1; fi
    npm install --prefix "$d12_tmp/runtime" --ignore-scripts --no-audit --no-fund \
      @embedded-postgres/linux-x64@18.7.0-beta.19 @sparticuz/chromium@153.0.0
    pg_pkg="$d12_tmp/runtime/node_modules/@embedded-postgres/linux-x64"
    node "$pg_pkg/scripts/hydrate-symlinks.js"
    pg_bin="$pg_pkg/native/bin"
    openssl rand -hex 24 > "$d12_tmp/password"
    "$pg_bin/initdb" -D "$d12_tmp/db" -U d12 --pwfile="$d12_tmp/password" \
      --auth-host=scram-sha-256 --auth-local=scram-sha-256 --locale=C --encoding=UTF8 >/dev/null
    echo "unix_socket_directories = ''" >> "$d12_tmp/db/postgresql.conf"
    "$pg_bin/pg_ctl" -D "$d12_tmp/db" -l "$d12_tmp/postgres.log" -o '-h 127.0.0.1 -p 5497' -w start
    DATABASE_URL="postgresql://d12:$(cat "$d12_tmp/password")@127.0.0.1:5497/hydroland_d12_uat"
    D12_BROWSER_PATH=$(cd "$d12_tmp/runtime" && node --input-type=module -e "import chromium from '@sparticuz/chromium'; console.log(await chromium.executablePath())")
    export DATABASE_URL D12_BROWSER_PATH
    ;;
  github-ci)
    [[ "${GITHUB_ACTIONS:-}" == true && "${DATABASE_URL:-}" == 'postgresql://hydroland:hydroland@localhost:5432/hydroland' ]] || exit 1
    export DATABASE_URL=postgresql://hydroland:hydroland@127.0.0.1:5432/hydroland_d12_uat
    ;;
  *) echo 'Choose render-build or github-ci' >&2; exit 2 ;;
esac
node_modules/.bin/prisma db push --schema apps/api/prisma/schema.prisma --skip-generate
node apps/api/dist/main.js > "$d12_tmp/api.log" 2>&1 &
api_pid=$!
curl --noproxy 127.0.0.1 --retry 30 --retry-delay 1 --retry-connrefused --fail --silent \
  http://127.0.0.1:3197/api/v1/health/ready >/dev/null
node --test scripts/d12-audit-summary.test.mjs
node apps/api/scripts/d12-dashboard-uat.mjs

if [[ "$1" == render-build ]]; then
  # Only the fixed receipt is published. No database, account, log or application is served.
  mkdir -p d12-verification
  echo 'D12 isolated acceptance passed.' > d12-verification/index.html
fi
