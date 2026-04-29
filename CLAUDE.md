# Game Development Framework

## Nav
| path | role |
|------|------|
| `shared/` | Packet definitions, shared types, game meta data | → `shared/CLAUDE.md` |
| `tools/` | Automation pipeline (gen-data, gen-packets, gen-orm) | → `tools/CLAUDE.md` |
| `client/` | Client app — stack defined by user | → `client/CLAUDE.md` |
| `server/` | Server app + DB schema — stack defined by user | → `server/CLAUDE.md` |

## Pipeline
```
shared/datas/**/*.csv       → gen:data    → {client,server}/generated/data/**/*.json
shared/packets/*.packet.json → gen:packets → {client,server}/generated/packets/*
server/db/schema.json        → gen:orm     → DB CREATE/ALTER TABLE (+ migration SQL)
```
CMD: `tools/gen-all.bat` | `npm run gen:all`

## Rules
- NEVER edit `*/generated/*` — edit source, re-run gen
- NEVER commit `.env` — use `.env.example`
- NEVER store secrets in `framework.ini` — secrets go in `.env`
- NEW_DIR: create `CLAUDE.md` for it + update parent `## Nav` section
- CONFIG priority: `.env` > `framework.ini` > hardcoded defaults
- `_` prefix files/dirs are skipped by all gen tools (examples, drafts)

## Formats
FILE (data):   `[domain]_[table].csv`          e.g. `characters_base.csv`
FILE (packet): `[domain].packet.json`           e.g. `player.packet.json`
FILE (db):     `schema.json` (single file)
FILE (gen):    auto-named from source filename

## Serena
SKIP: `*/generated/` — always navigate source files
ENTRY: `shared/packets/` → protocol source | `shared/datas/` → data source
FIND (packet def): `*.packet.json` in `shared/packets/`
FIND (data schema): `*.csv` rows 1-4 in `shared/datas/`
FIND (db schema): `server/db/schema.json`
