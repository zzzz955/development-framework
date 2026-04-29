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

## Steps
1. Read `GITHUB_DEFAULT_ASSIGNEE` from `.env`.
2. Parse `{도메인}` and `{이슈번호}` from $ARGUMENTS. If malformed, ask the user to clarify.
3. Run `git status` and `git diff` to inspect all changes.
4. Group changes by logical work unit. If multiple distinct units exist, plan separate commits.
5. For each commit:
   a. Stage only the relevant files. Never stage `.env` or `.gitignore`-matched files.
   b. Draft the commit message following the convention above.
   c. Show staged files and draft message — ask for confirmation before committing.
   d. Run `git commit -m "[message]"` with UTF-8 encoding for Korean characters.
6. After all commits: run `git push`.
7. Report each commit hash and the push result.

Safety: Never use `--force` push. Never commit `.env`.
