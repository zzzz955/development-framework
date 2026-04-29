# shared — Cross-Cutting Definitions

## Nav
| path | role |
|------|------|
| `packets/` | Packet protocol definitions (source for gen-packets) | → `packets/CLAUDE.md` |
| `datas/` | Game meta data / design data (source for gen-data) | → `datas/CLAUDE.md` |
| `types/` | Shared enums and constants | → `types/CLAUDE.md` |

## Rules
- This directory contains ONLY language-agnostic source definitions
- Generated output lives in `*/generated/` — never here
- `_` prefix files/dirs are skipped by gen tools (use for examples/drafts)
- When adding a new subdomain: create subdirectory + `CLAUDE.md` + update Nav above
