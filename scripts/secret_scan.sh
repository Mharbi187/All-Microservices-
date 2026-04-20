#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[secret-scan] Checking tracked secret-like files..."

blocked_patterns=(
  '.env'
  '**/.env'
  'detection-*.json'
  '**/detection-*.json'
  'keys/*.json'
  '**/keys/*.json'
  '*service-account*.json'
  '**/*service-account*.json'
  '*.pem'
  '**/*.pem'
  '*.key'
  '**/*.key'
)

found=0
for pattern in "${blocked_patterns[@]}"; do
  matches="$(git ls-files "$pattern" || true)"
  if [[ -n "$matches" ]]; then
    echo "[secret-scan] BLOCKED pattern '$pattern' matched tracked files:"
    echo "$matches"
    found=1
  fi
done

if [[ "$found" -ne 0 ]]; then
  echo "[secret-scan] FAILED. Remove tracked secrets and rotate leaked credentials."
  exit 1
fi

echo "[secret-scan] OK"
