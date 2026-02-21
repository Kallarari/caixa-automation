#!/usr/bin/env bash
set -euo pipefail

# Script para iniciar processamento paralelo com N workers no Linux
# Divide as cidades e inicia cada worker em background, salvando logs em temp/

WORKER_COUNT="${1:-2}"
TEMP_DIR="temp"
PIDS=()

cleanup() {
  if [ ${#PIDS[@]} -gt 0 ]; then
    echo ""
    echo "Interrompendo workers..."
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
    done
  fi
}

trap cleanup INT TERM

echo "Iniciando processamento paralelo com ${WORKER_COUNT} workers..."
echo ""

echo "Passo 1: Dividindo cidades em grupos..."
MODE=divide WORKER_COUNT="$WORKER_COUNT" npm run dev

echo ""
echo "Divisao concluida!"
echo ""

mkdir -p "$TEMP_DIR"

echo "Passo 2: Iniciando ${WORKER_COUNT} workers em background..."
echo ""

for ((i=0; i<WORKER_COUNT; i++)); do
  LOG_FILE="${TEMP_DIR}/worker-${i}.log"
  echo "  Iniciando worker $((i + 1)) (log: ${LOG_FILE})..."

  MODE=worker WORKER_ID="$i" WORKER_COUNT="$WORKER_COUNT" npm run dev >"$LOG_FILE" 2>&1 &
  PIDS+=("$!")
done

echo ""
echo "${WORKER_COUNT} workers iniciados!"
echo ""
echo "Dica: acompanhe os logs com:"
echo "  tail -f ${TEMP_DIR}/worker-0.log"
echo ""

wait
