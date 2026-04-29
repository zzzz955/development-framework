Pull the latest changes from the remote repository.

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`

## Steps
1. Run `git status` to check for uncommitted local changes.
2. If uncommitted changes exist, warn the user — they may cause merge conflicts.
   Ask whether to stash them first (`git stash`), or proceed anyway.
3. Run `git pull` (or `git stash && git pull && git stash pop` if the user chose to stash).
4. If merge conflicts occur, list the conflicting files and STOP — do NOT attempt auto-resolve.
5. Report what was pulled (number of commits received, files changed).
6. If any gen source files changed (`shared/datas/`, `shared/packets/`, `server/db/schema.json`),
   suggest running `/gen` or `/sync-check` to update generated files.
