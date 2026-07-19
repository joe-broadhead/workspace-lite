#!/usr/bin/env bash
# Push, version, and redeploy a single workspace-lite service.
# Usage: ./deploy-single.sh /path/to/workspace-lite <service> "Deploy message"
set -euo pipefail

REPO="${1:?Usage: $0 /path/to/workspace-lite <service> \"deploy message\"}"
SVC="${2:?Usage: $0 /path/to/workspace-lite <service> \"deploy message\"}"
MSG="${3:-Deploy $SVC $(date +%Y-%m-%d)}"

if [ ! -d "$REPO/packages/drive/apps-script" ]; then
  echo "ERROR: $REPO does not appear to be a workspace-lite repository"
  exit 1
fi
if [ ! -f "$REPO/.env" ]; then
  echo "ERROR: $REPO/.env not found"
  exit 1
fi
if [ ! -d "$REPO/packages/$SVC/apps-script" ]; then
  echo "ERROR: $REPO/packages/$SVC/apps-script not found. Valid services: drive gmail calendar sheets slides docs tasks forms"
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
cd "$REPO/packages/$SVC/apps-script"

echo "=== Deploying $SVC ==="

echo "Pushing..."
clasp push --force 2>&1 | tail -1

echo "Creating version..."
V=$(clasp version "$MSG" 2>&1 | sed -n 's/Created version \([0-9][0-9]*\)/\1/p')
if [ -z "$V" ]; then
  echo "ERROR: Failed to create version for $SVC (clasp version output mismatch)"
  exit 1
fi
echo "Version: $V"

env_var="GOOGLE_WORKSPACE_$(echo "$SVC" | tr '[:lower:]' '[:upper:]')_PROXY_URL"
env_url="${!env_var}"
if [ -z "$env_url" ]; then
  echo "ERROR: $env_var is not set in .env"
  exit 1
fi

env_id=$(echo "$env_url" | sed -n 's/.*macros\/s\/\(AKfy[a-zA-Z0-9_-]*\).*/\1/p')
if [ -z "$env_id" ]; then
  echo "ERROR: Could not extract deployment ID from $env_var URL"
  exit 1
fi

echo "Redeploying version $V to $env_id..."
if ! clasp redeploy "$env_id" -V "$V" -d "$MSG" 2>&1 | tail -1; then
  echo "ERROR: clasp redeploy failed for $SVC"
  exit 1
fi

echo "Verifying..."
# || true: with pipefail, a missing env_id would otherwise kill the script
# before the warning below can explain what happened.
state=$(clasp deployments 2>&1 | { grep "$env_id" || true; } | sed -n 's/.*\(@[0-9][0-9]*\).*/\1/p')
if [ "$state" != "@$V" ]; then
  echo "WARNING: Deployment may have changed ID. Expected @$V, got $state"
else
  echo "Verified: $state"
fi
echo "Done."
