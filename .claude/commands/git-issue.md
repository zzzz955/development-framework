Create a GitHub issue and add it to the project with appropriate metadata.

Arguments: $ARGUMENTS — format: `{도메인}:{이슈명}` e.g. `서버:로그인 API 구현`, `클라:플레이어 이동 처리`

## Prerequisites
Read `.env` and verify the following are set. If any are missing, STOP and notify the user:
- `GITHUB_TOKEN`
- `GITHUB_REPO_URL`
- `GITHUB_DEFAULT_PROJECT`
- `GITHUB_DEFAULT_ASSIGNEE`

## Issue Title Convention
```
[{도메인}] {이슈명}
```
Example: `[서버] 로그인 API 구현`

## Steps

### 1. Parse arguments
- Extract `{도메인}` and `{이슈명}` from $ARGUMENTS (split on first `:`).
- If malformed, ask the user to clarify.

### 2. Date fields
- Start date and Target date: leave blank — the user sets these directly in GitHub.

### 3. Determine Priority and Size (autonomous — no confirmation needed)
Assess based on the issue name and domain and set immediately:
- Priority: `Urgent` / `High` / `Medium` / `Low`
- Size: `XS` / `S` / `M` / `L` / `XL`
Report your chosen values and reasoning in the final summary.
If the values need adjustment, the user will modify them directly in GitHub.

### 4. Determine labels
Select appropriate labels based on the issue's nature (e.g. `bug`, `enhancement`, `feature`, `data`, `packet`, `db`, `infra`).
- List candidate labels and check which exist in the repo: `gh label list --repo {owner/repo}`
- For any needed label that does NOT exist, create it first:
  `gh label create "{label}" --repo {owner/repo} --color "{hex}" --description "{desc}"`

### 5. Determine the current Iteration (Sprint)
Query the project's iterations via GitHub Projects v2 API to find the active sprint.
Use `gh api graphql` to fetch the project's iterationField values and select the current one.

### 6. Create the issue (title only, no body/description)
```bash
gh issue create \
  --repo {owner/repo} \
  --title "[{도메인}] {이슈명}" \
  --assignee {GITHUB_DEFAULT_ASSIGNEE} \
  --label "{label1},{label2}"
```
Ensure the title is passed with proper UTF-8 encoding for Korean characters.

### 7. Add the issue to the project and set fields
After creation, get the issue URL and node ID, then:
```bash
gh project item-add {project_number} --owner {owner} --url {issue_url}
```
Then set each field via `gh project item-edit`:
- Assignee: already set at creation
- Priority: set to autonomously determined value
- Size: set to autonomously determined value
- Iteration: set to current sprint
- Start date: leave blank
- Target date: leave blank
- Status: leave as default (do not set)

Use `gh api graphql` to query field IDs from the project before editing.

### 8. Report
Output the created issue URL and a summary of all fields set.
If any field failed to set, note it clearly so the user can fix it manually.
