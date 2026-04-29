# shared/packets — Packet Protocol Definitions

## Rules
FILE: `[domain].packet.json`  e.g. `player.packet.json`
CMD:  `npm run gen:packets` → `*/generated/packets/[domain].packets.cs` (or `.hpp`)
SKIP: files with `_` prefix

## Packet JSON Schema
```json
{
  "namespace": "domain",
  "packets": [
    {
      "id": 1001,
      "name": "PacketName",
      "direction": "c2s",
      "description": "optional",
      "fields": [
        { "name": "fieldName", "type": "int32", "optional": false }
      ]
    }
  ]
}
```

## Field Types
int8 / int16 / int32 / int64 | uint8 / uint16 / uint32 / uint64
float / double | bool | string | string(N) | [EnumName]

## Direction
c2s = client → server | s2c = server → client | both = bidirectional

## Packet ID Ranges
Define ranges per domain at project start to prevent collisions.
Example: 1000-1999 player | 2000-2999 inventory | 9000-9999 system

## Constraints
- Packet IDs must be globally unique across ALL .packet.json files
- gen-packets validates cross-file duplicates and aborts on conflict

## Serena
FIND: packet struct → generated file `*/generated/packets/[domain].packets.cs`
SKIP: generated files — edit source `.packet.json` and re-run gen
