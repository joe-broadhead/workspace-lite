#!/usr/bin/env bash
# Verify that all .env deployment URLs match the current clasp deployments.
# Usage: ./verify-deployments.sh /path/to/workspace-lite
set -euo pipefail

REPO="${1:?Usage: $0 /path/to/workspace-lite}"

if [ ! -d "$REPO/packages/drive/apps-script" ]; then
  echo "ERROR: $REPO does not appear to be a workspace-lite repository"
  exit 1
fi
if [ ! -f "$REPO/.env" ]; then
  echo "ERROR: $REPO/.env not found"
  exit 1
fi

load_env() {
  local env_file="$1"
  local sanitized_env
  sanitized_env=$(mktemp)
  tr -d '\r' < "$env_file" > "$sanitized_env"
  # shellcheck source=/dev/null
  source "$sanitized_env"
  rm -f "$sanitized_env"
}

load_env "$REPO/.env"
SERVICES=(drive gmail calendar sheets slides docs tasks forms)
ISSUES=0

printf "%-10s %-8s %-55s %s\n" "SERVICE" "VERSION" "DEPLOYMENT_ID" "STATUS"
printf "%-10s %-8s %-55s %s\n" "-------" "-------" "-------------------------------------------------------" "------"

for svc in "${SERVICES[@]}"; do
  cd "$REPO/packages/$svc/apps-script"

  env_var="GOOGLE_WORKSPACE_$(echo "$svc" | tr '[:lower:]' '[:upper:]')_PROXY_URL"
  env_url="${!env_var}"
  if [ -z "$env_url" ]; then
    printf "%-10s %-8s %-55s %s\n" "$svc" "????" "<unset>" "ENV_VAR_MISSING"
    ISSUES=$((ISSUES + 1))
    continue
  fi

  env_id=$(echo "$env_url" | sed -n 's/.*macros\/s\/\(AKfy[a-zA-Z0-9_-]*\).*/\1/p')
  if [ -z "$env_id" ]; then
    printf "%-10s %-8s %-55s %s\n" "$svc" "????" "$env_url" "MALFORMED_URL"
    ISSUES=$((ISSUES + 1))
    continue
  fi

  dep_line=$(clasp deployments 2>&1 | grep "$env_id" || true)

  if [ -z "$dep_line" ]; then
    printf "%-10s %-8s %-55s %s\n" "$svc" "????" "$env_id" "MISSING"
    ISSUES=$((ISSUES + 1))
  else
    dep_ver=$(echo "$dep_line" | sed -n 's/.*\(@[0-9][0-9]*\).*/\1/p')
    # shellcheck disable=SC2001
    dep_desc=$(echo "$dep_line" | sed 's/^[^@]*@[0-9][0-9]*[ ]*[- ][ ]*//')
    printf "%-10s %-8s %-55s %s\n" "$svc" "$dep_ver" "$env_id" "$dep_desc"
  fi
done

echo ""
if [ "$ISSUES" -gt 0 ]; then
  echo "WARNING: $ISSUES deployment(s) have issues. Run deploy-all.sh to fix."
  exit 1
else
  echo "All deployments match .env URLs."
fi

# Optional CLI doctor (env presence) when wslite is built in the monorepo
WSLITE_BIN=""
if [ -x "$REPO/packages/cli/dist/index.js" ]; then
  WSLITE_BIN="node $REPO/packages/cli/dist/index.js"
elif command -v wslite >/dev/null 2>&1; then
  WSLITE_BIN="wslite"
fi

if [ -n "$WSLITE_BIN" ]; then
  echo ""
  echo "=== wslite doctor (env presence; no secrets) ==="
  # shellcheck disable=SC2086
  if ! $WSLITE_BIN doctor; then
    echo "WARNING: wslite doctor reported missing env for one or more catalog services"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo ""
  echo "NOTE: wslite not built (packages/cli/dist/index.js missing); skip doctor check"
fi
