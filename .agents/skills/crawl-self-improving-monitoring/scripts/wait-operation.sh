#!/usr/bin/env bash
# Bloqueia até uma CrawlerOperation chegar a estado final.
# Uso: API_BASE=http://localhost/api/admin/crawler TOKEN=... wait-operation.sh <operation_id> [intervalo_s=30] [timeout_s=7200]
# Saída: 0 = succeeded, 1 = failed/cancelled, 2 = timeout, 3 = erro de uso/HTTP.
set -euo pipefail

op_id="${1:?uso: wait-operation.sh <operation_id> [intervalo_s] [timeout_s]}"
interval="${2:-30}"
timeout="${3:-7200}"
: "${API_BASE:?defina API_BASE (ex.: http://localhost/api/admin/crawler)}"
: "${TOKEN:?defina TOKEN (token Sanctum de platform admin)}"
command -v jq >/dev/null || { echo "jq não encontrado" >&2; exit 3; }

deadline=$(( $(date +%s) + timeout ))
while :; do
  body=$(curl -fsS -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" \
    "$API_BASE/operations/$op_id") || { echo "falha HTTP ao consultar operação $op_id" >&2; exit 3; }
  state=$(jq -r '.data.state' <<<"$body")
  progress=$(jq -r '.data.progress | "\(.stage // "-") \(.percentage // 0)% \(.processed // 0)/\(.total // "?") \(.message // "")"' <<<"$body")
  echo "$(date +%H:%M:%S) op=$op_id state=$state $progress"

  case "$state" in
    succeeded) jq '.data | {id, type, state, result, discovery_snapshot_id}' <<<"$body"; exit 0 ;;
    failed|cancelled) jq '.data | {id, type, state, error, timeline}' <<<"$body"; exit 1 ;;
  esac

  if (( $(date +%s) >= deadline )); then
    echo "timeout aguardando operação $op_id (último estado: $state)" >&2
    exit 2
  fi
  sleep "$interval"
done
