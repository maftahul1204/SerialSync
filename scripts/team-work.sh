#!/usr/bin/env bash
# Switch to a teammate's branch and set their git author (shared laptop workflow).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

member="${1:-}"
if [[ -z "$member" ]]; then
  echo "Usage: ./scripts/team-work.sh {adil|rohan|jannat|fahim}"
  exit 1
fi

"$ROOT/scripts/set-author.sh" "$member"

if git show-ref --verify --quiet "refs/heads/$member"; then
  git checkout "$member"
else
  git checkout -b "$member"
fi

echo ""
echo "Ready: branch=$(git branch --show-current)"
echo "Edit files, then:"
echo "  git add -A"
echo "  git commit -m \"Your message\""
echo "  git push -u origin $member"
