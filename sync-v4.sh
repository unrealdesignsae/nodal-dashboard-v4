#!/bin/bash
set -e
cd /root/nodal-dashboard-v4
node build-sheet-data.cjs
if git diff --quiet lib/sheet-data.ts build-sheet-data.cjs; then
  echo "[$(date)] No changes."
else
  git add lib/sheet-data.ts build-sheet-data.cjs
  git commit -m "chore: auto-sync $(date '+%Y-%m-%d %H:%M')"
  git -c credential.helper='!gh auth git-credential' push origin main
  echo "[$(date)] V4 pushed. Vercel auto-redeploying."
fi
