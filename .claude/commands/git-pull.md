Pull the latest changes from the remote repository.

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`

## Git Command Rule
Never use `cd {path} && git ...`. Always use `git -C {repo_path} <subcommand>` to avoid permission prompts.

## Steps
1. Run `git pull` immediately — no pre-checks or confirmations needed.
   - If merge conflicts occur: list the conflicting files and STOP. Do NOT attempt auto-resolve.
2. Report what was pulled (number of commits received, files changed).
3. If any gen source files changed (`shared/datas/`, `shared/packets/`, `server/db/schema.json`),
   suggest running `/gen` or `/sync-check` to update generated files.
