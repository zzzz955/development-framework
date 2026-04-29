# Game Development Framework

Tech-agnostic game development framework with automated data, packet, and DB sync pipelines.

## Quick Start

```bash
# 1. Clone & configure
cp .env.example .env
# Edit .env with your DB credentials and GitHub token

# 2. Install (optional DB drivers)
npm install

# 3. Run full generation pipeline
tools/gen-all.bat        # Windows
sh tools/gen-all.sh      # Unix/Mac
```

## Directory Structure

```
shared/datas/     Game meta data (CSV) → generated to client & server
shared/packets/   Packet protocol definitions → generated to client & server
server/db/        DB runtime schema (schema.json) → synced to DB server
tools/            Automation scripts
client/           Client application (stack chosen by user)
server/           Server application (stack chosen by user)
```

## Configuration

| File | Purpose |
|------|---------|
| `.env` | Secrets: DB password, GitHub token, JWT secret |
| `framework.ini` | Settings: paths, languages, type maps, gen behavior |

## Gen Pipeline

| Command | Source | Output |
|---------|--------|--------|
| `npm run gen:data` | `shared/datas/**/*.csv` | `*/generated/data/**/*.json` |
| `npm run gen:packets` | `shared/packets/*.packet.json` | `*/generated/packets/*` |
| `npm run gen:orm` | `server/db/schema.json` | DB CREATE/ALTER TABLE |

## CSV Format (shared/datas/)

```
Row 1: field names (variable name mapping)
Row 2: target scope — C (client), S (server), CS (both)
Row 3: normalized type — int8/16/32/64, uint8/16/32/64, float, double, bool, string, string(N), [EnumName]
Row 4: constraints — PK, FK:[table], NN, UQ, IDX, AUTO (combinable with comma)
Row 5+: actual data
```

**Encoding: UTF-8 without BOM**
- Google Sheets → Download as CSV (always UTF-8, recommended)
- Excel → Save As → "CSV UTF-8 (Comma delimited)" (NOT legacy CSV)
- The gen tool strips BOM automatically if present

Files and directories prefixed with `_` are skipped by all gen tools.

## DB Schema Format (server/db/schema.json)

```json
{
  "database": "game_db",
  "tables": [
    {
      "name": "players",
      "columns": [
        { "name": "id", "type": "int64", "constraints": ["PK", "AUTO", "NN"] },
        { "name": "username", "type": "string(50)", "constraints": ["NN", "UQ"] }
      ]
    }
  ]
}
```

Supported DB types (in `.env`): `postgresql`, `mysql`, `sqlite`

gen:orm with `dry_run=true` (default in `framework.ini`) generates SQL files only.
Set `dry_run=false` to execute on the connected DB server.

## Claude Code Skills

| Command | Action |
|---------|--------|
| `/gen` | Run full gen pipeline |
| `/new-domain [name]` | Scaffold new data domain in shared/datas/ |
| `/sync-check` | Check if generated files are up to date |
| `/git-issue` | Create GitHub issue |
| `/git-commit` | Commit with conventional commit message |
| `/git-push` | Push to remote |
| `/git-pull` | Pull from remote |
| `/git-commitandpush` | Commit + push in one step |
