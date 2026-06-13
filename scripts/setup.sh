#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICES=("drive" "gmail" "calendar" "sheets" "slides" "docs")

banner() { echo -e "${BLUE}=== $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

# ── Prerequisites ──
banner "Prerequisites"
if ! command -v clasp &>/dev/null; then
  echo "clasp is not installed. Install it: npm install -g @google/clasp"
  exit 1
fi
if ! command -v node &>/dev/null; then
  echo "Node.js is required. Install Node 20+ from https://nodejs.org"
  exit 1
fi
success "clasp and Node.js found"

# ── clasp login ──
banner "clasp login"
if ! clasp login --status &>/dev/null 2>&1; then
  echo "Logging into Google... A browser will open."
  clasp login
fi
success "clasp authenticated"

# ── Build ──
banner "Build"
cd "$ROOT"
npm install --silent
npm run build
success "Build complete"

# ── Create Projects + Push ──
banner "Creating Apps Script projects (6 total)"
for svc in "${SERVICES[@]}"; do
  dir="$ROOT/packages/$svc/apps-script"
  echo ""
  echo "→ $svc"

  # Check if already has clasp project
  if [ -f "$dir/.clasp.json" ]; then
    existing_id=$(grep -o '"scriptId"[[:space:]]*:[[:space:]]*"[^"]*"' "$dir/.clasp.json" 2>/dev/null | grep -o '"[^"]*"$' | tr -d '"' || true)
    if [ -n "$existing_id" ] && [ "$existing_id" != "YOUR_SCRIPT_ID" ]; then
      warn "$svc already has a clasp project ($existing_id). Skipping creation."
      cd "$dir" && clasp push --force 2>&1 | tail -1
      continue
    fi
  fi

  cd "$dir"

  # Create project title
  title=""
  case "$svc" in
    drive)    title="Google Workspace Proxy - Drive" ;;
    gmail)    title="Google Workspace Proxy - Gmail" ;;
    calendar) title="Google Workspace Proxy - Calendar" ;;
    sheets)   title="Google Workspace Proxy - Sheets" ;;
    slides)   title="Google Workspace Proxy - Slides" ;;
    docs)     title="Google Workspace Proxy - Docs" ;;
  esac

  clasprc="$dir/.clasprc.json"
  if ! clasp create --type standalone --title "$title" 2>/dev/null; then
    warn "Could not create $svc project. Check clasp login."
    continue
  fi

  # Restore our appsscript.json (clasp create overwrites it)
  cat > "$dir/appsscript.json" << 'APPSS'
{
  "timeZone": "America/Chicago",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  },
  "executionApi": {
    "access": "ANYONE"
  }
}
APPSS

  # Set correct OAuth scopes
  scope=""
  case "$svc" in
    drive)    scope='"https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/script.external_request"' ;;
    gmail)    scope='"https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/script.send_mail", "https://www.googleapis.com/auth/script.external_request"' ;;
    calendar) scope='"https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/script.external_request"' ;;
    sheets)   scope='"https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/script.external_request"' ;;
    slides)   scope='"https://www.googleapis.com/auth/presentations", "https://www.googleapis.com/auth/script.external_request"' ;;
    docs)     scope='"https://www.googleapis.com/auth/documents", "https://www.googleapis.com/auth/script.external_request"' ;;
  esac

  # Write appsscript.json with correct scopes
  cat > "$dir/appsscript.json" << EOF
{
  "timeZone": "America/Chicago",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [${scope}],
  "runtimeVersion": "V8",
  "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE" },
  "executionApi": { "access": "ANYONE" }
}
EOF

  clasp push --force
  success "$svc: project created and code pushed"
done

# ── Deployment Guide ──
banner "Deployment"
echo ""
echo "Each service needs a web app deployment. You'll need to do this 6 times."
echo "For each service below:"
echo "  1. Run: cd packages/<service>/apps-script && clasp open"
echo "  2. Deploy → New deployment → Type: Web app"
echo "  3. Execute as: Me (USER_DEPLOYING)"
echo "  4. Access: Anyone"
echo "  5. Copy the deployment URL"
echo ""
echo "Services to deploy:"
for svc in "${SERVICES[@]}"; do
  echo "  - $svc: cd packages/$svc/apps-script && clasp open"
done
echo ""

# ── Token Bootstrap ──
banner "Bootstrap tokens"
echo ""
echo "After deploying each service, paste the deployment URLs below."
echo "Press Enter to skip a service (can run again later)."
echo ""

declare -A URLS
for svc in "${SERVICES[@]}"; do
  read -r -p "Deployment URL for $svc: " url
  if [ -n "$url" ]; then
    URLS[$svc]="$url"
  fi
done

echo ""
echo "# Generated on $(date)" > "$ROOT/.env"
echo "" >> "$ROOT/.env"

CONFIG_JSON=""
for svc in "${SERVICES[@]}"; do
  if [ -z "${URLS[$svc]:-}" ]; then continue; fi

  url="${URLS[$svc]}"
  echo "→ Bootstrapping $svc..."

  response=$(curl -sL "${url}?bootstrap=1" 2>/dev/null || echo '{"success":false}')
  token=$(echo "$response" | grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')

  if [ -z "$token" ]; then
    warn "Could not get token for $svc. Already bootstrapped? The URL may have been bootstrapped before."
    continue
  fi

  env_name=$(echo "$svc" | tr '[:lower:]' '[:upper:]')
  cat >> "$ROOT/.env" << EOF
export GOOGLE_WORKSPACE_${env_name}_PROXY_URL="$url"
export GOOGLE_WORKSPACE_${env_name}_PROXY_TOKEN="$token"
EOF

  success "$svc: token bootstrapped"
done

# ── Config output ──
banner "OpenCode Config"
echo ""
echo "Add these entries to your opencode.jsonc under \"mcpServers\":"
echo ""

for svc in "${SERVICES[@]}"; do
  env_name=$(echo "$svc" | tr '[:lower:]' '[:upper:]')
  name="google-${svc}"
  cat <<EOF
    "$name": {
      "type": "local",
      "command": ["npx", "tsx", "$ROOT/packages/$svc/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_${env_name}_PROXY_URL": "{env:GOOGLE_WORKSPACE_${env_name}_PROXY_URL}",
        "GOOGLE_WORKSPACE_${env_name}_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_${env_name}_PROXY_TOKEN}"
      }
    },
EOF
  echo ""
done

# ── Skill ──
banner "Install skill"
echo ""
echo "  ln -sf \"$ROOT/skills/google-workspace\" ~/.config/opencode/skills/google-workspace"
echo ""
success "Setup complete. Restart OpenCode to use all 118 tools."
