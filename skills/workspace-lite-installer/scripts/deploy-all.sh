#!/usr/bin/env bash
# Deploy all 8 workspace-lite services: push, version, and redeploy existing .env deployment IDs.
# Usage: ./deploy-all.sh /path/to/workspace-lite "Deploy message"
set -euo pipefail

REPO="${1:?Usage: $0 /path/to/workspace-lite \"deploy message\"}"
MSG="${2:-Deploy $(date +%Y-%m-%d)}"

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

echo "=== Deploying all services to $REPO ==="
echo "Message: $MSG"
echo ""

for svc in "${SERVICES[@]}"; do
  echo "--- $svc ---"
  cd "$REPO/packages/$svc/apps-script"

  echo "  Pushing..."
  clasp push --force 2>&1 | tail -1

  echo "  Creating version..."
  V=$(clasp version "$MSG" 2>&1 | sed -n 's/Created version \([0-9][0-9]*\)/\1/p')
  if [ -z "$V" ]; then
    echo "  ERROR: Failed to create version for $svc (clasp version output mismatch)"
    exit 1
  fi
  echo "  Version: $V"

  # Find the exact deployment ID from .env
  env_var="GOOGLE_WORKSPACE_$(echo $svc | tr '[:lower:]' '[:upper:]')_PROXY_URL"
  env_url="${!env_var}"
  if [ -z "$env_url" ]; then
    echo "  ERROR: $env_var is not set in .env"
    exit 1
  fi

  env_id=$(echo "$env_url" | sed -n 's/.*macros\/s\/\(AKfy[a-zA-Z0-9_-]*\).*/\1/p')
  if [ -z "$env_id" ]; then
    echo "  ERROR: Could not extract deployment ID from $env_var URL"
    exit 1
  fi

  echo "  Redeploying version $V to $env_id..."
  if ! clasp redeploy "$env_id" -V "$V" -d "$MSG" 2>&1 | tail -1; then
    echo "  ERROR: clasp redeploy failed for $svc"
    exit 1
  fi

  # Verify
  state=$(clasp deployments 2>&1 | grep "$env_id" | sed -n 's/.*\(@[0-9][0-9]*\).*/\1/p')
  if [ "$state" != "@$V" ]; then
    echo "  WARNING: Deployment may have changed ID. Expected @$V, got $state"
    echo "  URL may have changed. Check 'clasp deployments' and update .env if needed."
  else
    echo "  Verified: $state"
  fi
  echo ""
done

echo "=== Done ==="
