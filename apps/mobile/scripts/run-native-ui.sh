#!/usr/bin/env bash
set -euo pipefail
platform="${1:?Pass android or ios}"
case "$platform" in android|ios) ;; *) exit 2 ;; esac
artifact_dir="$PWD/apps/mobile/native-artifacts/$platform"
mkdir -p "$artifact_dir"
node apps/mobile/scripts/product-native-fixture.mjs > "$artifact_dir/synthetic-http-fixture.txt" 2>&1 &
fixture_pid=$!
cleanup() {
  local status=$?
  if [ "$platform" = android ]; then
    adb logcat -d -v threadtime -s 'ReactNativeJS:V' 'AndroidRuntime:E' > "$artifact_dir/native-runtime.txt" 2>&1 || true
  fi
  kill "$fixture_pid" 2>/dev/null || true
  wait "$fixture_pid" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT
ready=0
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:3001/api/v1/health/native-fixture > "$artifact_dir/synthetic-http-scope.json"; then ready=1; break; fi
  if ! kill -0 "$fixture_pid" 2>/dev/null; then cat "$artifact_dir/synthetic-http-fixture.txt"; exit 1; fi
  sleep 1
done
test "$ready" = 1
device=()
if [ "$platform" = ios ]; then device=(--device "${HYDROLAND_SIMULATOR_ID:?An installed simulator is required}"); fi
maestro "${device[@]}" test --format junit --output "$artifact_dir/junit.xml" \
  --test-output-dir "$artifact_dir/maestro" --debug-output "$artifact_dir/maestro" apps/mobile/.maestro
# Maestro 2.13 confines takeScreenshot to each flow's artifact bundle. Preserve
# those bundles, then copy the exact required images for the acceptance receipt.
node --input-type=module - "$artifact_dir" <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const expected = ['home.png', 'login-validation.png', 'native-capabilities.png',
  ...['ar', 'en'].flatMap(locale => ['account', 'credentials', 'trips', 'bookings', 'training', 'finance', 'notifications'].map(screen => `product-${locale}-${screen}.png`))];
const found = new Map(expected.map(name => [name, []]));
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (entry.isFile() && path.basename(folder) === 'takeScreenshot' && found.has(entry.name)) found.get(entry.name).push(filename);
  }
}
walk(path.join(root, 'maestro'));
for (const [name, files] of found) {
  assert.equal(files.length, 1, `Expected one current Maestro screenshot: ${name}`);
  assert(!fs.existsSync(path.join(root, name)), `Refusing stale screenshot: ${name}`);
}
for (const [name, files] of found) fs.copyFileSync(files[0], path.join(root, name), fs.constants.COPYFILE_EXCL);
JS
node apps/mobile/scripts/native-acceptance.mjs record-tests "$platform"
