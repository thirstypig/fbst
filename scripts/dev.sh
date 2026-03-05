#!/bin/bash

# Define absolute paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
TEMP_LOG="/tmp/fbst_server_dev.log"

# Load environment from server/.env
if [ -f "$SERVER_DIR/.env" ]; then
  set -a
  source "$SERVER_DIR/.env"
  set +a
fi

# Override defaults for local dev
export PORT=${PORT:-4002}
export CLIENT_URL=${CLIENT_URL:-"http://localhost:5173"}
export SERVER_ORIGIN=${SERVER_ORIGIN:-"http://localhost:4002"}
export NODE_ENV=${NODE_ENV:-"development"}
export APP_ENV=${APP_ENV:-"development"}

# Explicitly set Redirect URIs to match local proxy on 5173
# ISOLATION NOTE: These variables are the SINGLE source of truth for local Auth.
# If these are wrong, Auth will fail. Do not change without updating Google/Yahoo Consoles.
export GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI:-"https://localhost:5173/api/auth/google/callback"}
export YAHOO_REDIRECT_URI=${YAHOO_REDIRECT_URI:-"https://localhost:5173/api/auth/yahoo/callback"}

echo "🚀 Starting FBST Backend with environment from server/.env..."
echo "   PORT: $PORT"
echo "   CLIENT: $CLIENT_URL"
echo "   REDIRECTS: $GOOGLE_REDIRECT_URI"

# Kill any existing process on port 4002
lsof -t -i :4002 | xargs kill -9 2>/dev/null || true

# Navigate to server directory
cd "$SERVER_DIR"

# Start server using JITI (passing directory explicitly)
node -e "require('jiti')(process.cwd())('./src/index.ts')"
