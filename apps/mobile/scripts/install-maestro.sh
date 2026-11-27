#!/usr/bin/env bash
set -euo pipefail
maestro_root="${RUNNER_TEMP:?RUNNER_TEMP is required}/hydroland-maestro"
mkdir -p "$maestro_root"
curl --fail --location --retry 2 \
  'https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.13.0/maestro.zip' \
  --output "$maestro_root/maestro.zip"
python3 - "$maestro_root/maestro.zip" <<'PY'
import hashlib,sys
from pathlib import Path
actual=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()
assert actual=='ccc536679ed35e3a84b7e9e5c364f2371204c291fb331fec8c00e3e496dda5ff', actual
PY
unzip -q "$maestro_root/maestro.zip" -d "$maestro_root"
printf '%s\n' "$maestro_root/maestro/bin" >> "${GITHUB_PATH:?GITHUB_PATH is required}"
