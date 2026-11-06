#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

export PYTHONDONTWRITEBYTECODE=1

echo "ContextFlow deterministic baseline tests"
echo "Repository: ${REPO_DIR}"
echo "Python: $(${PYTHON_BIN} --version 2>&1)"

"${PYTHON_BIN}" -m pytest \
  "${REPO_DIR}/backend/tests" \
  -m "not live_integration" \
  -p no:cacheprovider

if [[ "${SKIP_FRONTEND:-0}" != "1" ]]; then
  if [[ ! -x "${REPO_DIR}/frontend/node_modules/.bin/tsc" ]]; then
    echo "Frontend dependencies are missing. Run 'npm ci' in frontend/ or set SKIP_FRONTEND=1." >&2
    exit 1
  fi
  (
    cd "${REPO_DIR}/frontend"
    npm run typecheck
  )
fi

if [[ "${RUN_LIVE_INTEGRATION:-0}" == "1" ]]; then
  "${PYTHON_BIN}" -m pytest \
    "${REPO_DIR}/backend/tests" \
    -m live_integration \
    -p no:cacheprovider
fi
