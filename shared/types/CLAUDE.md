# shared/types — Shared Enums and Constants

## Purpose
Language-agnostic definitions of enums and constants referenced in packet fields
and CSV row 3 type columns (e.g. `ItemType`, `PlayerState`).

## Rules
FILE: `[domain].types.json`  e.g. `item.types.json`
- Enum names must be PascalCase (matches usage in packet/CSV type fields)
- Values must be strings (used as string literals in generated code)

## Format
```json
{
  "ItemType": ["WEAPON", "ARMOR", "CONSUMABLE", "QUEST"],
  "PlayerState": ["IDLE", "MOVING", "ATTACKING", "DEAD"]
}
```

## Usage
- In `shared/packets/*.packet.json` field type: `"type": "ItemType"`
- In `shared/datas/**/*.csv` row 3: `ItemType`
- gen tools treat unknown types as EnumName passthrough (no type error)

## Note
Types here are documentation and validation hints.
Actual enum code must be written in client/server source.
