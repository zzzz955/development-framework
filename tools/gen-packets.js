'use strict';
/**
 * gen-packets: shared/packets/*.packet.json → generated output
 *
 * mode=protobuf  → generated/proto/{namespace}.proto          (run protoc separately)
 * mode=rest      → {client,server}/generated/packets/{namespace}.packets.{cs|hpp}
 *
 * Packet JSON schema:
 * {
 *   "namespace": "player",
 *   "packets": [
 *     {
 *       "name": "PlayerMoveRequest",
 *       "id": 1001,          // protobuf mode: required. rest mode: ignored.
 *       "direction": "c2s",  // protobuf mode: required (c2s|s2c|both). rest mode: ignored.
 *       "description": "optional",
 *       "fields": [
 *         { "name": "x", "type": "float", "optional": false }
 *       ]
 *     }
 *   ]
 * }
 */

const fs   = require('fs');
const path = require('path');
const cfg  = require('./config-loader');

const VALID_DIRECTIONS = new Set(['c2s', 's2c', 'both']);
const VALID_BASE_TYPES = new Set([
  'int8','int16','int32','int64',
  'uint8','uint16','uint32','uint64',
  'float','double','bool','string',
]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isValidType(t) {
  if (VALID_BASE_TYPES.has(t)) return true;
  if (/^string\(\d+\)$/.test(t)) return true;
  if (/^[A-Z][A-Za-z0-9_]*$/.test(t)) return true; // EnumName
  return false;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function toSnakeCase(s) {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// ── Field validation (shared across modes) ────────────────────────────────────
function validateFields(pkt, relPath, errors) {
  if (!Array.isArray(pkt.fields)) {
    errors.push({ file: relPath, loc: `Packet "${pkt.name}"`, msg: '"fields" must be an array' });
    return;
  }
  const seenFields = new Set();
  for (const field of pkt.fields) {
    const floc = `Packet "${pkt.name}", field "${field.name ?? '(unnamed)'}"`;
    if (!field.name) {
      errors.push({ file: relPath, loc: floc, msg: 'Missing field name' });
    }
    if (seenFields.has(field.name)) {
      errors.push({ file: relPath, loc: floc, msg: `Duplicate field name "${field.name}"` });
    }
    seenFields.add(field.name);
    if (!isValidType(field.type)) {
      errors.push({ file: relPath, loc: floc,
        msg: `Invalid type "${field.type}". Valid: int8~64, uint8~64, float, double, bool, string, string(N), EnumName` });
    }
  }
}

// ── Validation: protobuf mode (id + direction required) ───────────────────────
function validateProtobuf(def, filePath) {
  const relPath = path.relative(cfg.root, filePath);
  const errors  = [];

  if (!def.namespace || typeof def.namespace !== 'string') {
    errors.push({ file: relPath, loc: 'root', msg: 'Missing or invalid "namespace"' });
  }
  if (!Array.isArray(def.packets) || def.packets.length === 0) {
    errors.push({ file: relPath, loc: 'root', msg: 'Missing or empty "packets" array' });
    return errors;
  }

  const seenIds   = new Map();
  const seenNames = new Set();

  for (const pkt of def.packets) {
    const loc = `Packet "${pkt.name ?? '(unnamed)'}"`;

    if (!pkt.name || typeof pkt.name !== 'string') {
      errors.push({ file: relPath, loc, msg: 'Missing or invalid "name"' });
    }
    if (pkt.id === undefined || !Number.isInteger(pkt.id)) {
      errors.push({ file: relPath, loc, msg: '[protobuf] Missing or invalid "id" (must be integer)' });
    } else {
      if (seenIds.has(pkt.id)) {
        errors.push({ file: relPath, loc,
          msg: `Duplicate packet ID ${pkt.id} — also used by "${seenIds.get(pkt.id)}"` });
      }
      seenIds.set(pkt.id, pkt.name);
    }
    if (seenNames.has(pkt.name)) {
      errors.push({ file: relPath, loc, msg: `Duplicate packet name "${pkt.name}"` });
    }
    seenNames.add(pkt.name);

    if (!VALID_DIRECTIONS.has(pkt.direction)) {
      errors.push({ file: relPath, loc,
        msg: `[protobuf] Invalid direction "${pkt.direction}" (expected c2s, s2c, or both)` });
    }

    validateFields(pkt, relPath, errors);
  }

  return errors;
}

// ── Validation: rest mode (id + direction ignored) ────────────────────────────
function validateRest(def, filePath) {
  const relPath = path.relative(cfg.root, filePath);
  const errors  = [];

  if (!def.namespace || typeof def.namespace !== 'string') {
    errors.push({ file: relPath, loc: 'root', msg: 'Missing or invalid "namespace"' });
  }
  if (!Array.isArray(def.packets) || def.packets.length === 0) {
    errors.push({ file: relPath, loc: 'root', msg: 'Missing or empty "packets" array' });
    return errors;
  }

  const seenNames = new Set();
  for (const pkt of def.packets) {
    const loc = `Packet "${pkt.name ?? '(unnamed)'}"`;

    if (!pkt.name || typeof pkt.name !== 'string') {
      errors.push({ file: relPath, loc, msg: 'Missing or invalid "name"' });
    }
    if (seenNames.has(pkt.name)) {
      errors.push({ file: relPath, loc, msg: `Duplicate packet name "${pkt.name}"` });
    }
    seenNames.add(pkt.name);

    validateFields(pkt, relPath, errors);
  }

  return errors;
}

// ── Generator: protobuf → .proto ──────────────────────────────────────────────
function mapTypeProto(type, typeMap) {
  if (typeMap[type]) return typeMap[type];
  if (/^string\(\d+\)$/.test(type)) return 'string';
  return type; // EnumName passthrough
}

function generateProto(def, typeMap) {
  const lines = [
    '// AUTO-GENERATED — DO NOT EDIT',
    `// Source: shared/packets/${def.namespace}.packet.json`,
    '// Run: npm run gen:packets',
    '// Compile: protoc --csharp_out=... --cpp_out=... this file',
    '',
    'syntax = "proto3";',
    '',
    `package ${def.namespace};`,
    '',
  ];

  for (const pkt of def.packets) {
    const dirLabel = pkt.direction === 'c2s' ? 'client → server'
                   : pkt.direction === 's2c' ? 'server → client'
                   : 'bidirectional';
    if (pkt.description) lines.push(`// ${pkt.description}`);
    lines.push(`// [${dirLabel}]`);
    lines.push(`message ${pkt.name} {`);
    pkt.fields.forEach((f, i) => {
      const protoType = mapTypeProto(f.type, typeMap);
      const optional  = f.optional ? 'optional ' : '';
      const snakeName = toSnakeCase(f.name);
      lines.push(`  ${optional}${protoType} ${snakeName} = ${i + 1};`);
    });
    lines.push('}', '');
  }

  return lines.join('\n');
}

// ── Generator: rest → C# DTO ──────────────────────────────────────────────────
function mapType(type, typeMap) {
  if (typeMap[type]) return typeMap[type];
  if (/^string\(\d+\)$/.test(type)) return typeMap['string'] || 'string';
  return type; // EnumName passthrough
}

function generateCSharpDTO(def, namespace, typeMap) {
  const lines = [
    '// AUTO-GENERATED — DO NOT EDIT',
    `// Source: shared/packets/${def.namespace}.packet.json`,
    '// Run: npm run gen:packets',
    '',
    `namespace ${namespace}`,
    '{',
  ];

  for (const pkt of def.packets) {
    if (pkt.description) lines.push(`    // ${pkt.description}`);
    lines.push(`    public class ${pkt.name}`);
    lines.push('    {');
    for (const f of pkt.fields) {
      const t   = mapType(f.type, typeMap);
      const opt = f.optional ? '?' : '';
      lines.push(`        public ${t}${opt} ${capitalize(f.name)} { get; set; }`);
    }
    lines.push('    }', '');
  }

  lines.push('}');
  return lines.join('\n');
}

// ── Generator: rest → C++ DTO ─────────────────────────────────────────────────
function generateCppDTO(def, typeMap) {
  const guard = `GENERATED_PACKETS_${def.namespace.toUpperCase()}_HPP`;
  const lines = [
    '// AUTO-GENERATED — DO NOT EDIT',
    `// Source: shared/packets/${def.namespace}.packet.json`,
    '// Run: npm run gen:packets',
    '',
    `#ifndef ${guard}`,
    `#define ${guard}`,
    '',
    '#include <cstdint>',
    '#include <string>',
    '',
    'namespace packets {',
    '',
  ];

  for (const pkt of def.packets) {
    if (pkt.description) lines.push(`// ${pkt.description}`);
    lines.push(`struct ${pkt.name} {`);
    for (const f of pkt.fields) {
      const t = mapType(f.type, typeMap);
      lines.push(`    ${t} ${f.name};`);
    }
    lines.push('};', '');
  }

  lines.push('} // namespace packets', '', `#endif // ${guard}`);
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const { packetsDir, clientGenerated, serverGenerated, protoGenerated } = cfg.paths;
  const { mode, clientLanguage, serverLanguage, clientNamespace, serverNamespace } = cfg.packetGen;
  const typeMapProto = cfg.typeMap['proto']  || {};
  const typeMapC     = cfg.typeMap[clientLanguage] || {};
  const typeMapS     = cfg.typeMap[serverLanguage] || {};

  if (mode !== 'protobuf' && mode !== 'rest') {
    console.error(`[gen-packets] ERROR: Invalid mode "${mode}" in framework.ini. Expected: protobuf | rest`);
    process.exit(1);
  }

  console.log(`[gen-packets] Mode: ${mode}`);

  if (!fs.existsSync(packetsDir)) {
    console.log('[gen-packets] No packets dir:', path.relative(cfg.root, packetsDir));
    return;
  }

  const files = fs.readdirSync(packetsDir)
    .filter(f => !f.startsWith('_') && f.endsWith('.packet.json'));

  if (files.length === 0) {
    console.log('[gen-packets] No .packet.json files found.');
    return;
  }

  // ── Validation pass ───────────────────────────────────────────────────────
  const validate  = mode === 'protobuf' ? validateProtobuf : validateRest;
  const allErrors = [];
  const globalIds = new Map(); // protobuf cross-file ID check

  for (const file of files) {
    const filePath = path.join(packetsDir, file);
    const relPath  = path.relative(cfg.root, filePath);
    let def;
    try {
      def = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      allErrors.push([{ file: relPath, loc: 'root', msg: `JSON parse error: ${e.message}` }]);
      continue;
    }

    const errors = validate(def, filePath);
    if (errors.length) { allErrors.push(errors); continue; }

    if (mode === 'protobuf') {
      for (const pkt of def.packets) {
        if (globalIds.has(pkt.id)) {
          allErrors.push([{ file: relPath, loc: `Packet "${pkt.name}"`,
            msg: `Packet ID ${pkt.id} already used in "${globalIds.get(pkt.id)}"` }]);
        }
        globalIds.set(pkt.id, `${relPath}::${pkt.name}`);
      }
    }
  }

  if (allErrors.length > 0) {
    for (const errors of allErrors) {
      console.error(`[gen-packets] ERROR: ${errors[0].file}`);
      for (const e of errors) console.error(`  ${e.loc}: ${e.msg}`);
    }
    console.error(`\n${allErrors.flat().length} error(s) found. Aborting.`);
    process.exit(1);
  }

  // ── Generation pass ───────────────────────────────────────────────────────
  if (mode === 'protobuf') {
    ensureDir(protoGenerated);
    for (const file of files) {
      const filePath = path.join(packetsDir, file);
      const def      = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const outPath  = path.join(protoGenerated, `${def.namespace}.proto`);
      fs.writeFileSync(outPath, generateProto(def, typeMapProto), 'utf-8');
      console.log(`[gen-packets] OK: ${path.relative(cfg.root, outPath)}`);
    }
    console.log(`[gen-packets] Done: ${files.length} .proto file(s) generated.`);
    console.log(`[gen-packets] Next: run protoc on generated/proto/ to produce client/server code.`);
  } else {
    const clientPacketsDir = path.join(clientGenerated, 'packets');
    const serverPacketsDir = path.join(serverGenerated, 'packets');
    ensureDir(clientPacketsDir);
    ensureDir(serverPacketsDir);

    for (const file of files) {
      const filePath = path.join(packetsDir, file);
      const def      = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const targets = [
        { lang: clientLanguage, dir: clientPacketsDir, ns: clientNamespace, typeMap: typeMapC },
        { lang: serverLanguage, dir: serverPacketsDir, ns: serverNamespace, typeMap: typeMapS },
      ];

      for (const { lang, dir, ns, typeMap } of targets) {
        let content, ext;
        if (lang === 'csharp') {
          content = generateCSharpDTO(def, ns, typeMap);
          ext = '.cs';
        } else if (lang === 'cpp') {
          content = generateCppDTO(def, typeMap);
          ext = '.hpp';
        } else {
          console.warn(`[gen-packets] Unsupported language "${lang}" — skipping.`);
          continue;
        }
        const outPath = path.join(dir, `${def.namespace}.packets${ext}`);
        fs.writeFileSync(outPath, content, 'utf-8');
        console.log(`[gen-packets] OK: ${path.relative(cfg.root, outPath)}`);
      }
    }
    console.log(`[gen-packets] Done: ${files.length} file(s) processed.`);
  }
}

main();
