Push committed changes to the remote repository.

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`

## Steps
1. Run `git log origin/HEAD..HEAD --oneline` to list commits that will be pushed.
2. If no commits to push, report and stop.
3. Show the commit list to the user and confirm before pushing.
4. Run `git push`.
5. Report success with the branch name and number of commits pushed.

Safety: Never use `--force` unless the user explicitly requests it.
