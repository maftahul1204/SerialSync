#!/usr/bin/env bash
# Set commit author for THIS repo only (shared laptop — run before each person's commit).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

member="${1:-}"
case "$member" in
  adil)
    git config --local user.name "Md Adil Hossain"
    git config --local user.email "Adil1109@users.noreply.github.com"
    ;;
  rohan)
    git config --local user.name "Rohan Hasan Khan"
    git config --local user.email "Rohan108@users.noreply.github.com"
    ;;
  jannat)
    git config --local user.name "FM Maftahul Jannat"
    git config --local user.email "maftahul1204@users.noreply.github.com"
    ;;
  fahim)
    git config --local user.name "Md Abu Rafe Mostak H. Fahim"
    git config --local user.email "Fahim59-UAP@users.noreply.github.com"
    ;;
  *)
    echo "Usage: ./scripts/set-author.sh {adil|rohan|jannat|fahim}"
    exit 1
    ;;
esac

echo "Author for this repo: $(git config --local user.name) <$(git config --local user.email)>"
