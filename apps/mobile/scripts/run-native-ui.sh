#!/usr/bin/env bash
set -euo pipefail
platform="${1:?Pass android or ios}"
case "$platform" in android|ios) ;; *) exit 2 ;; esac
artifact_dir="$PWD/apps/mobile/native-artifacts/$platform"
mkdir -p "$artifact_dir"
node apps/mobile/scripts/product-native-fixture.mjs > "$artifact_dir/synthetic-http-fixture.txt" 2>&1 &
fixture_pid=$!
trap 'kill "$fixture_pid" 2>/dev/null || true' EXIT
ready=0
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:3001/api/v1/health/native-fixture > "$artifact_dir/synthetic-http-scope.json"; then ready=1; break; fi
  if ! kill -0 "$fixture_pid" 2>/dev/null; then cat "$artifact_dir/synthetic-http-fixture.txt"; exit 1; fi
  sleep 1
done
test "$ready" = 1
device=()
if [ "$platform" = ios ]; then device=(--device "${HYDROLAND_SIMULATOR_ID:?An installed simulator is required}"); fi
maestro "${device[@]}" test --format junit --output "$artifact_dir/junit.xml" -e ARTIFACT_DIR="$artifact_dir" apps/mobile/.maestro
node apps/mobile/scripts/native-acceptance.mjs record-tests "$platform"
