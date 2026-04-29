Run the full generation pipeline for this project.

Execute `tools/gen-all.bat` (Windows) or `sh tools/gen-all.sh` (Unix/Mac).

Steps:
1. Run gen-data: shared/datas/ CSV files → generated data JSON
2. Run gen-packets: shared/packets/ definitions → generated packet code
3. Run gen-orm: server/db/schema.json → DB sync + migration SQL

Report the output of each step. If any step fails, show the full error output and stop — do not continue to the next step.
