#!/bin/bash

# Define absolute paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"

# EPERM Fix: Force npm cache to a writable temp directory (just in case)
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

echo "🚀 Starting FBST Backend from COMPILED JS..."
echo "   PORT: $PORT"

# Run the compiled server
node server/dist/index.js
