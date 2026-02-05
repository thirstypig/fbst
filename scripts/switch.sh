#!/bin/bash

# Automation script to switch to FBST
# Clears competing ports and starts the dev server

echo "------------------------------------------"
echo "Switching to FBST..."
echo "------------------------------------------"

# 1. Kill and clear ports 4000 (Express), 5173 (Vite), and 24678 (Vite HMR)
echo "Stopping any competing processes on ports 4000, 5173, 24678..."
lsof -ti:4000,5173,24678 | xargs kill -9 2>/dev/null

# 2. Check for node/tsx processes that might be hanging
echo "Cleaning up node/tsx ghosts..."
killall -9 node tsx 2>/dev/null

# 3. Start development
echo "Launching FBST Backend (Port 4000)..."
npm run server > server.log 2>&1 &
echo "Launching FBST Frontend (Port 5173)..."
npm run dev
