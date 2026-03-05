#!/bin/bash

# Define absolute paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"

# EPERM Fix: Force npm cache to a writable temp directory
export npm_config_cache=/tmp/npm_cache

# Load environment from server/.env
if [ -f "$SERVER_DIR/.env" ]; then
  set -a
  source "$SERVER_DIR/.env"
  set +a
fi

# Override defaults for local dev
export PORT=${PORT:-4002}
export CLIENT_URL=${CLIENT_URL:-"https://localhost:5173"}
export SERVER_ORIGIN=${SERVER_ORIGIN:-"http://localhost:4002"}
export NODE_ENV=${NODE_ENV:-"development"}
export APP_ENV=${APP_ENV:-"development"}

# Explicitly set Redirect URIs to match local proxy on 5173
export GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI:-"https://localhost:5173/api/auth/google/callback"}
export YAHOO_REDIRECT_URI=${YAHOO_REDIRECT_URI:-"https://localhost:5173/api/auth/yahoo/callback"}

echo "🚀 Compiling Server (TSC)..."
# Compile to JS to avoid tsx/runtime permission issues
./server/node_modules/.bin/tsc -p server/tsconfig.json

if [ $? -ne 0 ]; then
  echo "⚠️  TSC had errors, but attempting to run anyway (dist files might be stale or partial)..."
fi


echo "🚀 Starting FBST Backend (Node Direct)..."
echo "   PORT: $PORT"

echo ""
echo "🔐 GOOGLE CLOUD CONSOLE REQUIRED CONFIG:"
echo "   Authorized Redirect URI: $GOOGLE_REDIRECT_URI"
echo "   (If you see redirect_uri_mismatch, add exactly this URL to https://console.cloud.google.com/apis/credentials)"
echo ""

# Run the compiled server
node server/dist/index.js
