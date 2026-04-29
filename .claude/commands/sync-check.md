Check whether generated files are up to date with their source files.

Steps:
1. For each CSV in `shared/datas/` (non-`_` prefixed), compare its modification time
   against corresponding JSON files in `client/generated/data/` and `server/generated/data/`.
2. For each `.packet.json` in `shared/packets/` (non-`_` prefixed), compare against
   generated files in `client/generated/packets/` and `server/generated/packets/`.
3. For `server/db/schema.json`, check if any migration SQL file exists in
   `server/db/migrations/` and report the latest one's timestamp.

Report format:
- STALE: [source file] → [generated file] (source is newer)
- OK:    [source file] → [generated file]
- MISSING: [generated file] does not exist yet

If any STALE or MISSING entries found, suggest running `/gen` or the specific gen command.
