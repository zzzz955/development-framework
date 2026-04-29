Push committed changes to the remote repository.

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`

## Git Command Rule
Never use `cd {path} && git ...`. Always use `git -C {repo_path} <subcommand>` to avoid permission prompts.

## Steps
1. Run `git log origin/HEAD..HEAD --oneline` to list commits that will be pushed.
2. If no commits to push, report and stop.
3. Run `git push` immediately — no confirmation needed.
   - If push is rejected (non-fast-forward conflict): STOP and notify the user with the conflicting branch info. Do NOT force push.
4. Report success with the branch name and number of commits pushed.

Safety: Never use `--force` unless the user explicitly requests it.
