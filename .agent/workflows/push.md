---
description: Push changes to git and update the commit hash on the home page
---

# Push and Update Commit Hash

This workflow commits all changes and pushes to git. The commit hash on the home page is **automatically updated at build time** via `vite.config.ts`.

## Steps

// turbo-all

1. Stage all changes:
   ```bash
   git add -A
   ```

2. Commit with a descriptive message:
   ```bash
   git commit -m "fix: <brief description of changes>"
   ```

3. Push to origin:
   ```bash
   git push origin main
   ```

> **Note**: The `__COMMIT_HASH__` in the UI is dynamically generated from `git rev-parse --short HEAD` during build. No manual update needed.
