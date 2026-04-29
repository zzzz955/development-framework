Scaffold a new data domain in shared/datas/.

Arguments: $ARGUMENTS (domain name, e.g. "characters" or "items")

Steps:
1. Validate the domain name: must be lowercase, no spaces (use underscores).
2. Create directory `shared/datas/[domain]/`.
3. Create `shared/datas/[domain]/CLAUDE.md` with this structure:
   ```
   # shared/datas/[domain] — [one-line description]

   ## Nav
   | file | role |
   |------|------|
   | *(add CSV files here as you create them)* | |

   ## Rules
   FILE: `[domain]_[table].csv`
   All tables in this domain follow the standard 5-row CSV header.
   ```
4. Create a template CSV `shared/datas/[domain]/[domain]_base.csv` with:
   - Row 1: `id,name` (placeholder — user should extend)
   - Row 2: `CS,CS`
   - Row 3: `int32,string`
   - Row 4: `PK,NN`
   - Row 5: (empty, user adds data)
5. Update `shared/datas/CLAUDE.md` Nav section — add the new domain as a row.
6. Report what was created.
