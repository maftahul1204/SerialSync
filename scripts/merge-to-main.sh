#!/usr/bin/env bash
# Merge one feature branch into main (run from repo root). Repeat for each branch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

branch="${1:-}"
if [[ -z "$branch" ]]; then
  echo "Usage: ./scripts/merge-to-main.sh {adil|rohan|jannat|fahim}"
  exit 1
fi

git fetch origin
git checkout main
git pull origin main

git merge "$branch" -m "Merge branch '$branch' into main"

echo ""
echo "Merged $branch into main. Review with: git log --oneline -5"
echo "Then push: git push origin main"
