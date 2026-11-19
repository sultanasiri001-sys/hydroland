#!/usr/bin/env bash
set -euo pipefail

# Run only in an isolated CI X11/D-Bus session against the local synthetic app.
: "${DISPLAY:?An isolated Xvfb display is required}"
: "${DBUS_SESSION_BUS_ADDRESS:?An isolated D-Bus session is required}"
: "${HL_ORCA_EVIDENCE_DIR:?An explicit evidence directory is required}"
mkdir -p "$HL_ORCA_EVIDENCE_DIR"
export ACCESSIBILITY_ENABLED=1
orca --version > "$HL_ORCA_EVIDENCE_DIR/orca-version.txt"
speech-dispatcher --version > "$HL_ORCA_EVIDENCE_DIR/speech-dispatcher-version.txt"
espeak-ng --version > "$HL_ORCA_EVIDENCE_DIR/espeak-version.txt"
hl_runtime_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/hydroland-a11y.XXXXXX")
hl_window_manager_pid=''
hl_orca_pid=''
hl_capture_pid=''
hl_pulse_pid=''
hl_speech_pid=''
stop_owned() {
  local hl_pid="$1"
  [[ -n "$hl_pid" ]] || return 0
  kill "$hl_pid" 2>/dev/null || true
  for hl_attempt in {1..30}; do
    kill -0 "$hl_pid" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 "$hl_pid" 2>/dev/null; then kill -KILL "$hl_pid" 2>/dev/null || true; fi
  wait "$hl_pid" 2>/dev/null || true
}
cleanup() {
  stop_owned "$hl_orca_pid"
  stop_owned "$hl_capture_pid"
  stop_owned "$hl_speech_pid"
  stop_owned "$hl_window_manager_pid"
  stop_owned "$hl_pulse_pid"
  rm -rf -- "$hl_runtime_dir"
}
trap cleanup EXIT
export PULSE_SERVER="unix:$hl_runtime_dir/pulse.sock"
export PULSE_SINK=hydroland_a11y
printf 'load-module module-native-protocol-unix socket=%s\nload-module module-null-sink sink_name=hydroland_a11y\nset-default-sink hydroland_a11y\n' "$hl_runtime_dir/pulse.sock" > "$hl_runtime_dir/pulse.pa"
pulseaudio --daemonize=no --use-pid-file=no --exit-idle-time=-1 -n --file="$hl_runtime_dir/pulse.pa" > "$HL_ORCA_EVIDENCE_DIR/pulse.log" 2>&1 &
hl_pulse_pid=$!
for hl_attempt in {1..50}; do
  if pactl info > "$HL_ORCA_EVIDENCE_DIR/pulse-info.txt" 2>/dev/null; then break; fi
  kill -0 "$hl_pulse_pid"
  sleep 0.1
done
pactl info > "$HL_ORCA_EVIDENCE_DIR/pulse-info.txt"
cp -R /etc/speech-dispatcher "$hl_runtime_dir/speechd-config"
printf '\nAudioOutputMethod "pulse"\nDefaultModule "espeak-ng"\n' >> "$hl_runtime_dir/speechd-config/speechd.conf"
mkdir -p "$HL_ORCA_EVIDENCE_DIR/speech-dispatcher"
export SPEECHD_ADDRESS="unix_socket:$hl_runtime_dir/speechd.sock"
speech-dispatcher --run-single --communication-method=unix_socket --socket-path="$hl_runtime_dir/speechd.sock" --pid-file="$hl_runtime_dir/speechd.pid" --timeout=0 --config-dir="$hl_runtime_dir/speechd-config" --log-dir="$HL_ORCA_EVIDENCE_DIR/speech-dispatcher" > "$HL_ORCA_EVIDENCE_DIR/speech-dispatcher-console.log" 2>&1 &
hl_speech_pid=$!
for hl_attempt in {1..50}; do
  [[ -S "$hl_runtime_dir/speechd.sock" ]] && break
  kill -0 "$hl_speech_pid"
  sleep 0.1
done
[[ -S "$hl_runtime_dir/speechd.sock" ]]
openbox > "$HL_ORCA_EVIDENCE_DIR/openbox.log" 2>&1 &
hl_window_manager_pid=$!

for hl_locale in ar en; do
  export HL_ORCA_LOCALE="$hl_locale"
  export HL_ORCA_DEBUG_LOG="$HL_ORCA_EVIDENCE_DIR/orca-$hl_locale.log"
  export HL_ORCA_PCM_FILE="$HL_ORCA_EVIDENCE_DIR/orca-$hl_locale.s16le"
  parec --device=hydroland_a11y.monitor --format=s16le --rate=16000 --channels=1 --raw > "$HL_ORCA_PCM_FILE" 2> "$HL_ORCA_EVIDENCE_DIR/capture-$hl_locale.log" &
  hl_capture_pid=$!
  hl_preferences="$HL_ORCA_EVIDENCE_DIR/preferences-$hl_locale"
  mkdir -p "$hl_preferences"
  # Configure a genuine installed eSpeak NG voice through Orca's supported
  # customizations file. No speech/event generator is replaced or monkeypatched.
  /usr/bin/python3 - "$hl_preferences" "$hl_locale" <<'PY'
import json
import pathlib
import sys
import speechd

preferences = pathlib.Path(sys.argv[1])
language = sys.argv[2]
client = speechd.SSIPClient('HydrolandVoiceCheck', autospawn=False)
try:
    client.set_output_module('espeak-ng')
    voices = client.list_synthesis_voices()
    selected = next((voice for voice in voices if voice[1].split('-')[0] == language), None)
    if selected is None:
        raise RuntimeError('Required installed speech voice is unavailable: ' + language)
    voice_name, voice_language, dialect = selected
finally:
    client.close()
family = {'name': voice_name, 'lang': voice_language, 'dialect': dialect}
source = '\n'.join([
    'from orca import settings',
    'from orca.acss import ACSS',
    "settings.speechServerFactory = 'speechdispatcherfactory'",
    "settings.speechServerInfo = ['eSpeak NG', 'espeak-ng']",
    'settings.enableSpeech = True',
    'settings.enableBraille = False',
    'settings.enableMouseReview = False',
    'settings.voices = {key: ACSS({"family": ' + repr(family) + '}) for key in settings.voices}',
    '',
])
(preferences / 'orca-customizations.py').write_text(source, encoding='utf8')
(preferences.parent / ('voice-' + language + '.json')).write_text(json.dumps(family, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
PY
  orca --replace --user-prefs "$hl_preferences" --enable speech --disable braille --debug-file "$HL_ORCA_DEBUG_LOG" > "$HL_ORCA_EVIDENCE_DIR/orca-$hl_locale-console.log" 2>&1 &
  hl_orca_pid=$!
  npx playwright test --config=playwright.orca.config.js
  stop_owned "$hl_orca_pid"
  hl_orca_pid=''
  stop_owned "$hl_capture_pid"
  hl_capture_pid=''
done
