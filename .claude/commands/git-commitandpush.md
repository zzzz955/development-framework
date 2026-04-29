Commit changes and push to remote in one step.

Arguments: $ARGUMENTS — format: `{도메인}#{이슈번호}` e.g. `서버#87`, `클라#12`

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`
- `GITHUB_DEFAULT_ASSIGNEE`

## Commit Message Convention
```
[{도메인}/{작업자}] #{이슈번호} {작업 내용 요약}
```
- `{작업자}`: value of `GITHUB_DEFAULT_ASSIGNEE` from `.env`

## Git Command Rule
Never use `cd {path} && git ...`. Always use `git -C {repo_path} <subcommand>` to avoid permission prompts.

## Steps
1. Read `GITHUB_DEFAULT_ASSIGNEE` from `.env`.
2. Parse `{도메인}` and `{이슈번호}` from $ARGUMENTS. If malformed, ask the user to clarify.
3. Run `git status` and `git diff` to inspect all changes.
4. Group changes by logical work unit. If multiple distinct units exist, plan separate commits.
5. For each commit:
   a. Stage only the relevant files. Never stage `.env` or `.gitignore`-matched files.
   b. Draft the commit message following the convention above.
   c. Run `git commit -m "[message]"` immediately — no confirmation needed.
6. After all commits: run `git push`.
   - If push is rejected (non-fast-forward conflict): STOP and notify the user. Do NOT force push.
7. Report each commit hash and the push result.

Safety: Never use `--force` push. Never commit `.env`.
