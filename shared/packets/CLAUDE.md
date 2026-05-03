# shared/packets — Packet Protocol Definitions

## Rules
FILE: `[domain].packet.json`  e.g. `player.packet.json`
CMD:  `npm run gen:packets` → output depends on mode (see below)
SKIP: files with `_` prefix

## Mode (`template.ini` → `[packet-gen] mode`)

### protobuf (default)
```
*.packet.json → generated/proto/*.proto   (intermediate — run protoc separately)
```
- `id` and `direction` are **required**
- Cross-file packet ID uniqueness is enforced
- protoc converts `.proto` to final C#/C++ code in client/server

### rest
```
*.packet.json → {client,server}/generated/packets/*.packets.{cs|hpp}
```
- `id` and `direction` are **ignored** (HTTP method + URL carry that semantics)
- Pure DTO classes generated directly

## Packet JSON Schema

```json
{
  "namespace": "player",
  "packets": [
    {
      "name": "PlayerMoveRequest",
      "id": 1001,
      "direction": "c2s",
      "description": "optional",
      "fields": [
        { "name": "x", "type": "float" },
        { "name": "y", "type": "float", "optional": true }
      ]
    }
  ]
}
```

`id` and `direction` required in protobuf mode, ignored in rest mode.

## Field Types
int8 / int16 / int32 / int64 | uint8 / uint16 / uint32 / uint64
float / double | bool | string | string(N) | [EnumName]

## Direction (protobuf mode only)
c2s = client → server | s2c = server → client | both = bidirectional

## Packet ID Ranges (protobuf mode only)
Define ranges per domain at project start to prevent collisions.
Example: 1000-1999 player | 2000-2999 inventory | 9000-9999 system

## Proto Field Naming
gen-packets converts camelCase → snake_case for proto output (proto3 convention).
`playerId` → `player_id`

## Serena
FIND (protobuf): source `.packet.json` | generated `generated/proto/*.proto`
FIND (rest): source `.packet.json` | generated `*/generated/packets/*.packets.cs`
SKIP: all `*/generated/` files — edit source and re-run gen
