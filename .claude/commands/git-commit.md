Commit staged changes using the project's commit message convention.

Arguments: $ARGUMENTS — format: `{도메인}#{이슈번호}` e.g. `서버#87`, `클라#12`

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`
- `GITHUB_DEFAULT_ASSIGNEE` — used as the committer name in message

## Commit Message Convention
```
[{도메인}/{작업자}] #{이슈번호} {작업 내용 요약}
```
- `{도메인}`: from $ARGUMENTS (e.g. 서버, 클라, 공통)
- `{작업자}`: value of `GITHUB_DEFAULT_ASSIGNEE` from `.env`
- `{이슈번호}`: from $ARGUMENTS (e.g. #87)
- `{작업 내용 요약}`: concise Korean summary of what changed

Example result: `[서버/전상혁] #87 플레이어 이동 패킷 핸들러 추가`

## Steps
1. Read `GITHUB_DEFAULT_ASSIGNEE` from `.env`.
2. Parse `{도메인}` and `{이슈번호}` from $ARGUMENTS.
   If either is missing or malformed, ask the user to clarify.
3. Run `git status` and `git diff` to inspect all changes.
4. Group changes by logical work unit (e.g. packet changes vs. data changes vs. server logic).
   If multiple distinct work units exist, plan separate commits for each.
5. For each commit:
   a. Stage only the files belonging to that work unit.
      Never stage `.env` or files matching `.gitignore`.
   b. Draft the commit message following the convention above.
   c. Show the staged files and draft message — ask for confirmation before committing.
   d. Run `git commit -m "[message]"` — ensure encoding is UTF-8 for Korean characters.
6. Report each commit hash and message after completion.
