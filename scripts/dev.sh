#!/bin/bash

# Define absolute paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
TEMP_LOG="/tmp/fbst_server_dev.log"

# Define Environment Variables Explicitly
# This isolates the dev environment from system permission issues and ensures consistency.

export PORT=4001
export CLIENT_URL="http://localhost:5173"
export SERVER_ORIGIN="http://localhost:4001"
export NODE_ENV="development"
export APP_ENV="development"
export DATABASE_URL="postgresql://neondb_owner:npg_JoyZW29bGNEv@ep-shiny-haze-afcdvtmf-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export SESSION_SECRET="d9b951f68c7b9c65a51c7a289595f817baf58f299c06510eb85c1872d83c1bc3"
export ADMIN_EMAILS="jimmychang316@gmail.com"

# Auth Credentials
export GOOGLE_CLIENT_ID="67372893718-sjs5dldmaetp3boes7recknshct5gda2.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="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"
export YAHOO_CLIENT_ID="dj0yJmk9U0lTbkV0NEppdmptJmQ9WVdrOWMyNWtkVEJYZUhZbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTU0"
export YAHOO_CLIENT_SECRET="877d5b7c20c5f0f731cf1fbff33d56dbb06ff107"

# Explicitly set Redirect URIs to match local proxy on 5173
# ISOLATION NOTE: These variables are the SINGLE source of truth for local Auth.
# If these are wrong, Auth will fail. Do not change without updating Google/Yahoo Consoles.
export GOOGLE_REDIRECT_URI="https://localhost:5173/api/auth/google/callback"
export YAHOO_REDIRECT_URI="https://localhost:5173/api/auth/yahoo/callback"

echo "🚀 Starting FBST Backend with explicit environment variables..."
echo "   PORT: $PORT"
echo "   CLIENT: $CLIENT_URL"
echo "   REDIRECTS: $GOOGLE_REDIRECT_URI"

# Kill any existing process on port 4001
lsof -t -i :4001 | xargs kill -9 2>/dev/null || true

# Navigate to server directory
cd "$SERVER_DIR"

# Start server using JITI (passing directory explicitly)
node -e "require('jiti')(process.cwd())('./src/index.ts')"

