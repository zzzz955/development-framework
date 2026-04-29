# client — [FILL IN: engine/framework name & version]

## Stack
[FILL IN when architecture is decided]
Example: Unity 6 (URP) | C# | Addressables

## Nav
| path | role |
|------|------|
| *(fill in after project structure is established)* | |
| `src/generated/` | Auto-generated — DO NOT edit | → see Rules |

## Rules
- NEVER edit `*/generated/*` — source is in `shared/`
- `generated/data/` ← from `shared/datas/` via `npm run gen:data`
- `generated/packets/` ← from `shared/packets/` via `npm run gen:packets`
- NEW_DIR: create `CLAUDE.md` for it + update Nav above

## Serena
[FILL IN when architecture is decided]
Example (Unity C#):
  FIND: `[Domain][Type].cs` → `find_symbol('[Domain][Type]')`
  ENTRY: `Assets/Scripts/[Domain]/` → domain barrel
  SKIP: `Assets/Scripts/Generated/` — auto-generated, navigate source
  PATTERN: 1 file = 1 primary class | namespace matches folder path

## Conventions
[FILL IN: naming rules, folder structure, coding style for chosen stack]
