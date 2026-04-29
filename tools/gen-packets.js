'use strict';
/**
 * gen-packets: shared/packets/*.packet.json → {client,server}/generated/packets/*
 *
 * Packet definition schema:
 * {
 *   "namespace": "player",
 *   "packets": [
 *     {
 *       "id": 1001,
 *       "name": "PlayerMoveRequest",
 *       "direction": "c2s",   // c2s | s2c | both
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

// ── Validation ────────────────────────────────────────────────────────────────
function validateDefinition(def, filePath) {
  const relPath = path.relative(cfg.root, filePath);
  const errors  = [];

  if (!def.namespace || typeof def.namespace !== 'string') {
    errors.push({ file: relPath, loc: 'root', msg: 'Missing or invalid "namespace" field' });
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
    if (pkt.id === undefined || typeof pkt.id !== 'number' || !Number.isInteger(pkt.id)) {
      errors.push({ file: relPath, loc, msg: 'Missing or invalid "id" (must be integer)' });
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
        msg: `Invalid direction "${pkt.direction}" (expected c2s, s2c, or both)` });
    }

    if (!Array.isArray(pkt.fields)) {
      errors.push({ file: relPath, loc, msg: '"fields" must be an array' });
      continue;
    }

    const seenFields = new Set();
    for (const field of pkt.fields) {
      const floc = `${loc}, field "${field.name ?? '(unnamed)'}"`;
      if (!field.name) errors.push({ file: relPath, loc: floc, msg: 'Missing field name' });
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

  return errors;
}

// ── Code generators ───────────────────────────────────────────────────────────
function mapType(type, lang, typeMap) {
  const override = typeMap[type];
  if (override) return override;
  // string(N) → string in all languages (length hint is for network layer)
  if (/^string\(\d+\)$/.test(type)) return typeMap['string'] || type;
  return type; // EnumName passthrough
}

function generateCSharp(def, namespace, typeMap, target) {
  const lines = [
    '// AUTO-GENERATED — DO NOT EDIT',
    `// Source: shared/packets/${def.namespace}.packet.json`,
    '// Run: npm run gen:packets',
    '',
    `namespace ${namespace}`,
    '{',
  ];

  for (const pkt of def.packets) {
    lines.push(`    public class ${pkt.name}`);
    lines.push('    {');
    for (const f of pkt.fields) {
      const t   = mapType(f.type, 'csharp', typeMap);
      const opt = f.optional ? '?' : '';
      lines.push(`        public ${t}${opt} ${capitalize(f.name)} { get; set; }`);
    }
    lines.push('    }', '');
  }

  // PacketId enum
  lines.push('    public static class PacketId', '    {');
  for (const pkt of def.packets) {
    lines.push(`        public const int ${pkt.name} = ${pkt.id};`);
  }
  lines.push('    }', '');

  // Direction type aliases
  const c2s = def.packets.filter(p => p.direction === 'c2s' || p.direction === 'both');
  const s2c = def.packets.filter(p => p.direction === 's2c' || p.direction === 'both');

  if (target === 'client') {
    if (c2s.length) lines.push(`    // Client sends: ${c2s.map(p => p.name).join(', ')}`);
    if (s2c.length) lines.push(`    // Client receives: ${s2c.map(p => p.name).join(', ')}`);
  } else {
    if (c2s.length) lines.push(`    // Server receives: ${c2s.map(p => p.name).join(', ')}`);
    if (s2c.length) lines.push(`    // Server sends: ${s2c.map(p => p.name).join(', ')}`);
  }

  lines.push('}');
  return lines.join('\n');
}

function generateCpp(def, typeMap, target) {
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
    `namespace packets {`,
    '',
  ];

  for (const pkt of def.packets) {
    if (pkt.description) lines.push(`// ${pkt.description}`);
    lines.push(`struct ${pkt.name} {`);
    for (const f of pkt.fields) {
      const t = mapType(f.type, 'cpp', typeMap);
      lines.push(`    ${t} ${f.name};`);
    }
    lines.push('};', '');
  }

  // Packet ID enum
  lines.push('enum class PacketId : int32_t {');
  for (const pkt of def.packets) {
    lines.push(`    ${pkt.name} = ${pkt.id},`);
  }
  lines.push('};', '');
  lines.push('} // namespace packets', '', `#endif // ${guard}`);

  return lines.join('\n');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const { packetsDir, clientGenerated, serverGenerated } = cfg.paths;
  const { clientLanguage, serverLanguage, clientNamespace, serverNamespace } = cfg.packetGen;
  const typeMapC = cfg.typeMap[clientLanguage] || {};
  const typeMapS = cfg.typeMap[serverLanguage] || {};

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

  // ── Cross-file duplicate ID check ─────────────────────────────────────────
  const globalIds = new Map();
  const allErrors = [];

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

    const errors = validateDefinition(def, filePath);
    if (errors.length) { allErrors.push(errors); continue; }

    for (const pkt of def.packets) {
      if (globalIds.has(pkt.id)) {
        allErrors.push([{ file: relPath, loc: `Packet "${pkt.name}"`,
          msg: `Packet ID ${pkt.id} already used in "${globalIds.get(pkt.id)}"` }]);
      }
      globalIds.set(pkt.id, `${relPath}::${pkt.name}`);
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

  // ── Generate ───────────────────────────────────────────────────────────────
  const clientPacketsDir = path.join(clientGenerated, 'packets');
  const serverPacketsDir = path.join(serverGenerated, 'packets');
  ensureDir(clientPacketsDir);
  ensureDir(serverPacketsDir);

  for (const file of files) {
    const filePath = path.join(packetsDir, file);
    const def      = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const baseName = def.namespace;

    const generators = [
      { lang: clientLanguage, dir: clientPacketsDir, ns: clientNamespace, typeMap: typeMapC, target: 'client' },
      { lang: serverLanguage, dir: serverPacketsDir, ns: serverNamespace, typeMap: typeMapS, target: 'server' },
    ];

    for (const { lang, dir, ns, typeMap, target } of generators) {
      let content, ext;
      if (lang === 'csharp') {
        content = generateCSharp(def, ns, typeMap, target);
        ext = '.cs';
      } else if (lang === 'cpp') {
        content = generateCpp(def, typeMap, target);
        ext = '.hpp';
      } else {
        console.warn(`[gen-packets] Unsupported language "${lang}" for ${target} — skipping.`);
        continue;
      }
      const outPath = path.join(dir, `${baseName}.packets${ext}`);
      fs.writeFileSync(outPath, content, 'utf-8');
      console.log(`[gen-packets] OK: ${path.relative(cfg.root, outPath)}`);
    }
  }

  console.log(`[gen-packets] Done: ${files.length} file(s) processed.`);
}

main();
