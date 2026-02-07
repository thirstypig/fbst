---
description: Push changes to git and update the commit hash on the home page
---

# Push and Update Commit Hash

This workflow commits all changes, updates the commit hash displayed on the home page, and pushes to git.

## Steps

// turbo-all

1. Stage all changes:
   ```bash
   git add -A
   ```

2. Commit with a descriptive message:
   ```bash
   git commit -m "chore: <brief description of changes>"
   ```

3. Get the new short commit hash:
   ```bash
   git rev-parse --short HEAD
   ```

4. Update `client/src/pages/Home.tsx` with the new commit hash in the `__COMMIT_HASH__` variable (usually defined in `vite.config.ts` or as a global).

5. If the hash is defined in vite.config.ts, update it there:
   ```bash
   # Look for __COMMIT_HASH__ definition
   grep -rn "__COMMIT_HASH__" client/
   ```

6. Amend the commit if needed to include the hash update:
   ```bash
   git add -A && git commit --amend --no-edit
   ```

7. Push to origin:
   ```bash
   git push origin main
   ```
