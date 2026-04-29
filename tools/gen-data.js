'use strict';
/**
 * gen-data: shared/datas/**\/*.csv → {client,server}/generated/data/**\/*.json
 *
 * CSV structure:
 *   Row 1: field names
 *   Row 2: target scope  — C | S | CS
 *   Row 3: normalized type — int8/16/32/64, uint8/16/32/64, float, double,
 *                            bool, string, string(N), [EnumName]
 *   Row 4: constraints   — PK, FK:[table], NN, UQ, IDX, AUTO (comma-separated)
 *   Row 5+: actual data
 */

const fs   = require('fs');
const path = require('path');
const cfg  = require('./config-loader');

const VALID_PRIMITIVE_TYPES = new Set([
  'int8','int16','int32','int64',
  'uint8','uint16','uint32','uint64',
  'float','double','bool','string',
]);

const VALID_CONSTRAINTS = new Set(['PK','FK','NN','UQ','IDX','AUTO']);
const VALID_TARGETS     = new Set(['C','S','CS']);

// ── helpers ───────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function stripBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      fields.push(cur.trim()); cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function isValidType(t) {
  if (VALID_PRIMITIVE_TYPES.has(t)) return true;
  if (/^string\(\d+\)$/.test(t)) return true;   // string(N)
  if (/^[A-Z][A-Za-z0-9_]*$/.test(t)) return true; // EnumName
  return false;
}

function coerceValue(raw, type, fieldName, csvFile, rowIdx, errors) {
  if (raw === '' || raw === null || raw === undefined) return null;
  if (type.startsWith('int') || type.startsWith('uint')) {
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      errors.push({ file: csvFile, row: rowIdx, field: fieldName,
        msg: `value "${raw}" cannot be parsed as ${type}` });
      return null;
    }
    return n;
  }
  if (type === 'float' || type === 'double') {
    const n = Number(raw);
    if (isNaN(n)) {
      errors.push({ file: csvFile, row: rowIdx, field: fieldName,
        msg: `value "${raw}" cannot be parsed as ${type}` });
      return null;
    }
    return n;
  }
  if (type === 'bool') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    errors.push({ file: csvFile, row: rowIdx, field: fieldName,
      msg: `value "${raw}" cannot be parsed as bool (expected true/false)` });
    return null;
  }
  return raw; // string, string(N), EnumName → keep as string
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(content, filePath) {
  const relPath = path.relative(cfg.root, filePath);
  const lines   = stripBOM(content).split(/\r?\n/).filter(l => l.trim() !== '');
  const errors  = [];

  if (lines.length < 5) {
    errors.push({ file: relPath, row: 1, field: '-',
      msg: 'CSV must have at least 5 rows (header rows 1-4 + at least 1 data row)' });
    return { errors, schema: null, clientData: null, serverData: null };
  }

  const names       = parseCSVLine(lines[0]);
  const targets     = parseCSVLine(lines[1]);
  const types       = parseCSVLine(lines[2]);
  const constraints = parseCSVLine(lines[3]);
  const colCount    = names.length;

  // ── Validate header rows ──────────────────────────────────────────────────
  for (let c = 0; c < colCount; c++) {
    const name = names[c];
    if (!name) {
      errors.push({ file: relPath, row: 1, field: `col[${c}]`,
        msg: 'Field name cannot be empty' });
    }

    const target = targets[c];
    if (!VALID_TARGETS.has(target)) {
      errors.push({ file: relPath, row: 2, field: name,
        msg: `"${target}" is not a valid target (expected C, S, or CS)` });
    }

    const type = types[c];
    if (!isValidType(type)) {
      errors.push({ file: relPath, row: 3, field: name,
        msg: `"${type}" is not a valid type` });
    }

    const constraintList = constraints[c] ? constraints[c].split(',').map(s => s.trim()) : [];
    for (const con of constraintList) {
      const base = con.split(':')[0];
      if (con && !VALID_CONSTRAINTS.has(base)) {
        errors.push({ file: relPath, row: 4, field: name,
          msg: `"${con}" is not a valid constraint` });
      }
    }
  }

  if (errors.length > 0) return { errors, schema: null, clientData: null, serverData: null };

  // ── Build column metadata ─────────────────────────────────────────────────
  const cols = names.map((name, c) => ({
    name,
    target:      targets[c],
    type:        types[c],
    constraints: constraints[c] ? constraints[c].split(',').map(s => s.trim()).filter(Boolean) : [],
  }));

  const pkCol = cols.find(col => col.constraints.includes('PK'));

  // ── Parse data rows ───────────────────────────────────────────────────────
  const clientData = [];
  const serverData = [];

  for (let r = 4; r < lines.length; r++) {
    const values  = parseCSVLine(lines[r]);
    const rowNum  = r + 1; // 1-based for user display
    const rowErrors = [];

    // Validate PK not null
    if (pkCol) {
      const pkIdx = cols.indexOf(pkCol);
      const pkVal = values[pkIdx];
      if (pkVal === '' || pkVal === undefined) {
        rowErrors.push({ file: relPath, row: rowNum, field: pkCol.name,
          msg: `NULL value not allowed for primary key (PK)` });
      }
    }

    // Validate NN constraints
    for (let c = 0; c < colCount; c++) {
      if (cols[c].constraints.includes('NN') && (values[c] === '' || values[c] === undefined)) {
        rowErrors.push({ file: relPath, row: rowNum, field: cols[c].name,
          msg: `NULL value not allowed (NN constraint)` });
      }
    }

    errors.push(...rowErrors);
    if (rowErrors.length > 0) continue;

    const clientRow = {};
    const serverRow = {};

    for (let c = 0; c < colCount; c++) {
      const col = cols[c];
      const val = coerceValue(values[c], col.type, col.name, relPath, rowNum, errors);
      if (cfg.dataGen.clientTargets.includes(col.target)) clientRow[col.name] = val;
      if (cfg.dataGen.serverTargets.includes(col.target)) serverRow[col.name] = val;
    }

    clientData.push(clientRow);
    serverData.push(serverRow);
  }

  const schema = {
    columns: cols.map(({ name, target, type, constraints }) =>
      ({ name, target, type, constraints })),
  };

  return { errors, schema, clientData, serverData };
}

// ── Recursive CSV scan ────────────────────────────────────────────────────────
function collectCSVFiles(dir, base) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('_')) continue;
    const full = path.join(dir, entry);
    const rel  = base ? path.join(base, entry) : entry;
    if (fs.statSync(full).isDirectory()) {
      results.push(...collectCSVFiles(full, rel));
    } else if (entry.endsWith('.csv')) {
      results.push({ full, rel });
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const { datasDir, clientGenerated, serverGenerated } = cfg.paths;
  const csvFiles = collectCSVFiles(datasDir, '');

  if (csvFiles.length === 0) {
    console.log('[gen-data] No CSV files found in', path.relative(cfg.root, datasDir));
    return;
  }

  let totalErrors = 0;
  const allErrors = [];

  for (const { full, rel } of csvFiles) {
    const content = fs.readFileSync(full, 'utf-8');
    const { errors, clientData, serverData } = parseCSV(content, full);

    if (errors.length > 0) {
      allErrors.push({ rel, errors });
      totalErrors += errors.length;
      continue;
    }

    const baseName   = path.basename(rel, '.csv');
    const subDir     = path.dirname(rel);
    const clientDir  = path.join(clientGenerated, 'data', subDir);
    const serverDir  = path.join(serverGenerated, 'data', subDir);

    ensureDir(clientDir);
    ensureDir(serverDir);

    fs.writeFileSync(path.join(clientDir, `${baseName}.json`),
      JSON.stringify(clientData, null, 2), 'utf-8');
    fs.writeFileSync(path.join(serverDir, `${baseName}.json`),
      JSON.stringify(serverData, null, 2), 'utf-8');

    console.log(`[gen-data] OK: ${rel}`);
  }

  if (allErrors.length > 0) {
    console.error('');
    for (const { rel, errors } of allErrors) {
      console.error(`[gen-data] ERROR: ${rel}`);
      for (const e of errors) {
        console.error(`  Row ${e.row}, Field "${e.field}": ${e.msg}`);
      }
    }
    console.error(`\n${totalErrors} error(s) found. Aborting.`);
    process.exit(1);
  }

  console.log(`[gen-data] Done: ${csvFiles.length} file(s) processed.`);
}

main();
