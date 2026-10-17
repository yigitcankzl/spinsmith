#!/usr/bin/env bash
set -euo pipefail

CLI=(npx @iwsdk/cli)
TIMEOUT=90000

status="$("${CLI[@]}" dev status)"
jq -e '.data.state.browserCommandReady == true' >/dev/null <<<"$status" || {
  echo 'Managed IWSDK browser is not ready. Run: npx @iwsdk/cli dev up' >&2
  exit 1
}

xr="$("${CLI[@]}" xr status)"
if [[ "$(jq -r '.data.result.sessionActive' <<<"$xr")" != true ]]; then
  "${CLI[@]}" xr enter --timeout "$TIMEOUT" >/dev/null
fi
echo 'desk-ko: entering hand mode' >&2
"${CLI[@]}" xr set-input-mode --input-json '{"mode":"hand"}' --timeout "$TIMEOUT" >/dev/null
"${CLI[@]}" xr set-transform --input-json '{"device":"hand-right","position":{"x":0,"y":1.6,"z":-0.6}}' --timeout "$TIMEOUT" >/dev/null

echo 'desk-ko: preparing deterministic fight' >&2
setup="$("${CLI[@]}" browser run scripts/reset-desk-ko-target.mjs --timeout "$TIMEOUT")"
sx="$(jq -r '.data.result.strike.x' <<<"$setup")"
sy="$(jq -r '.data.result.strike.y' <<<"$setup")"
sz="$(jq -r '.data.result.strike.z' <<<"$setup")"
before="$(jq -r '.data.result.interventions' <<<"$setup")"
hx="$(awk -v n="$sx" 'BEGIN { printf "%.6f", n - 0.008 }')"
hz="$(awk -v n="$sz" 'BEGIN { printf "%.6f", n - 0.042 }')"
high="$(awk -v n="$sy" 'BEGIN { printf "%.6f", n + 0.20 }')"
low="$(awk -v n="$sy" 'BEGIN { printf "%.6f", n + 0.01 }')"

"${CLI[@]}" xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":{\"x\":$hx,\"y\":$high,\"z\":$hz}}" --timeout "$TIMEOUT" >/dev/null
echo 'desk-ko: stamping the arena with the emulated palm' >&2
"${CLI[@]}" xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":{\"x\":$hx,\"y\":$low,\"z\":$hz}}" --timeout "$TIMEOUT" >/dev/null

state=''
for _ in 1 2 3; do
  state="$("${CLI[@]}" browser run scripts/get-drive-state.mjs --timeout "$TIMEOUT")"
  [[ "$(jq -r '.data.result.desk.scored' <<<"$state")" == true ]] && break
done

after="$(jq -r '.data.result.diagnostics.interventions' <<<"$state")"
awarded="$(jq -r '.data.result.desk.awarded' <<<"$state")"
score="$(jq -r '.data.result.score[0]' <<<"$state")"
if (( after <= before )) || [[ "$awarded" != 3 || "$score" != 3 ]]; then
  jq '.data.result | {phase, score, desk, diagnostics}' <<<"$state" >&2
  echo "Desk KO proof failed: interventions $before->$after, awarded=$awarded, score=$score" >&2
  exit 1
fi

echo 'desk-ko: capturing verified result' >&2
capture="$("${CLI[@]}" browser run scripts/capture-desk-ko-proof.mjs --timeout "$TIMEOUT")"
jq -n \
  --argjson before "$before" \
  --argjson after "$after" \
  --arg path "$(jq -r '.data.result.path' <<<"$capture")" \
  '{ok:true, handInterventions:{before:$before,after:$after}, deskKo:{awarded:3,score:[3,0]}, screenshot:$path}'
