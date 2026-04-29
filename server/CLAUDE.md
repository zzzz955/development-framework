# server — [FILL IN: framework name & version]

## Stack
[FILL IN when architecture is decided]
Example A (stateless): ASP.NET Core 8 | C# | Entity Framework Core
Example B (stateful):  C++ | Boost.Asio | custom binary protocol

## Nav
| path | role |
|------|------|
| `db/` | DB schema definition + migration history | → `db/CLAUDE.md` |
| *(fill in after project structure is established)* | |
| `src/generated/` | Auto-generated — DO NOT edit | → see Rules |

## Rules
- NEVER edit `*/generated/*` — source is in `shared/`
- `generated/data/` ← from `shared/datas/` via `npm run gen:data`
- `generated/packets/` ← from `shared/packets/` via `npm run gen:packets`
- `generated/` is NOT for DB models — DB is managed via `db/schema.json`
- NEW_DIR: create `CLAUDE.md` for it + update Nav above

## DB Schema
File: `server/db/schema.json`
CMD:  `npm run gen:orm` → reads schema.json → syncs tables on connected DB
Migration SQL is saved to `server/db/migrations/` (review before applying in production)
See `server/db/schema.json` format in README.md

## Serena
[FILL IN when architecture is decided]
Example A (ASP.NET C#):
  FIND: `[Domain][Type].cs` → `find_symbol('[Domain][Type]')`
  PATTERN: namespace `[Project].[Domain].[Layer]`
  ENTRY: `[domain]/` → scan with `get_symbols_overview`

Example B (C++ Boost.Asio):
  FIND: `[domain]_[type].hpp` → `find_symbol('namespace::[ClassName]')`
  PATTERN: 1 .hpp per class | implementation in matching .cpp
  ENTRY: `include/` → all public interfaces

## Conventions
[FILL IN: naming rules, layer structure, coding style for chosen stack]
