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

source "$REPO/.env"
SERVICES=(drive gmail calendar sheets slides docs tasks forms)
ISSUES=0

printf "%-10s %-8s %-55s %s\n" "SERVICE" "VERSION" "DEPLOYMENT_ID" "STATUS"
printf "%-10s %-8s %-55s %s\n" "-------" "-------" "-------------------------------------------------------" "------"

for svc in "${SERVICES[@]}"; do
  cd "$REPO/packages/$svc/apps-script"

  env_var="GOOGLE_WORKSPACE_$(echo $svc | tr '[:lower:]' '[:upper:]')_PROXY_URL"
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
