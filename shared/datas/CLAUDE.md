# shared/datas — Game Meta Data

## Nav
| path | role |
|------|------|
| *(user-created)* | One subdirectory per data domain (e.g. `characters/`, `items/`) |

## Rules
FILE: `[domain]_[table].csv`  e.g. `characters_base.csv`, `items_effects.csv`
CMD:  `npm run gen:data` → `*/generated/data/[domain]/[table].json`
SKIP: files and directories with `_` prefix

## CSV Structure (rows 1-4 are metadata, row 5+ is data)
```
Row 1: field names        — camelCase, maps to JSON keys and code variables
Row 2: target scope       — C (client-only) | S (server-only) | CS (both)
Row 3: normalized type    — int8/16/32/64, uint8/16/32/64, float, double,
                            bool, string, string(N), [EnumName]
Row 4: constraints        — PK, FK:[table], NN, UQ, IDX, AUTO (comma-separated)
Row 5+: actual data
```

## Encoding
UTF-8 without BOM. gen-data strips BOM automatically if present.
- Google Sheets → Download as CSV (recommended)
- Excel → Save As → "CSV UTF-8 (Comma delimited)"

## Adding a New Data Domain
1. Create `shared/datas/[domain]/`
2. Create `shared/datas/[domain]/CLAUDE.md` describing the domain
3. Add CSV files: `[domain]_[table].csv`
4. Update Nav section above

## Output
gen-data generates separate JSON per target:
- Client: CS + C columns → `client/generated/data/[domain]/[table].json`
- Server: CS + S columns → `server/generated/data/[domain]/[table].json`
