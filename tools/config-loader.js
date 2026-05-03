'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── INI parser (no dependencies) ─────────────────────────────────────────────
function parseIni(content) {
  const cfg = {};
  let section = '_';
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const sec = line.match(/^\[(.+)\]$/);
    if (sec) { section = sec[1]; cfg[section] = cfg[section] || {}; continue; }
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      cfg[section] = cfg[section] || {};
      cfg[section][k] = v;
    }
  }
  return cfg;
}

// ── .env parser (no dependencies) ────────────────────────────────────────────
function parseEnv(content) {
  const env = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      env[k] = v;
    }
  }
  return env;
}

// ── Load config ───────────────────────────────────────────────────────────────
function load() {
  const iniPath = path.join(ROOT, 'template.ini');
  const envPath = path.join(ROOT, '.env');

  if (!fs.existsSync(iniPath)) {
    console.error('[config] ERROR: template.ini not found at', iniPath);
    process.exit(1);
  }

  const ini = parseIni(fs.readFileSync(iniPath, 'utf-8'));
  const env = fs.existsSync(envPath)
    ? parseEnv(fs.readFileSync(envPath, 'utf-8'))
    : {};

  // Merge process.env on top
  Object.assign(env, process.env);

  const p = ini['paths'] || {};

  return {
    root: ROOT,

    paths: {
      datasDir:        path.join(ROOT, p['datas_dir']        || 'shared/datas/'),
      packetsDir:      path.join(ROOT, p['packets_dir']      || 'shared/packets/'),
      dbSchema:        path.join(ROOT, p['db_schema']        || 'server/db/schema.json'),
      clientGenerated: path.join(ROOT, p['client_generated'] || 'client/src/generated/'),
      serverGenerated: path.join(ROOT, p['server_generated'] || 'server/src/generated/'),
      migrationsDir:   path.join(ROOT, p['migrations_dir']   || 'server/db/migrations/'),
      protoGenerated:  path.join(ROOT, p['proto_generated']  || 'generated/proto/'),
    },

    dataGen: {
      clientTargets: (ini['data-gen']?.['client_targets'] || 'CS,C').split(',').map(s => s.trim()),
      serverTargets: (ini['data-gen']?.['server_targets'] || 'CS,S').split(',').map(s => s.trim()),
    },

    packetGen: {
      mode:            ini['packet-gen']?.['mode']             || 'protobuf',
      clientLanguage:  ini['packet-gen']?.['client_language']  || 'csharp',
      serverLanguage:  ini['packet-gen']?.['server_language']  || 'csharp',
      clientNamespace: ini['packet-gen']?.['client_namespace'] || 'Generated.Packets',
      serverNamespace: ini['packet-gen']?.['server_namespace'] || 'Generated.Packets',
    },

    ormGen: {
      dryRun: (env['GEN_ORM_DRY_RUN'] ?? ini['orm-gen']?.['dry_run'] ?? 'true') !== 'false',
    },

    db: {
      type:     env['DB_TYPE']     || 'postgresql',
      host:     env['DB_HOST']     || 'localhost',
      port:     parseInt(env['DB_PORT'] || '5432', 10),
      name:     env['DB_NAME']     || 'game_db',
      user:     env['DB_USER']     || '',
      password: env['DB_PASSWORD'] || '',
      file:     env['DB_FILE']     || '',
    },

    typeMap: {
      proto:  ini['type-map.proto']  || {},
      csharp: ini['type-map.csharp'] || {},
      cpp:    ini['type-map.cpp']    || {},
    },

    github: {
      token:            env['GITHUB_TOKEN']            || '',
      repoUrl:          env['GITHUB_REPO_URL']         || '',
      defaultProject:   env['GITHUB_DEFAULT_PROJECT']  || '',
      defaultAssignee:  env['GITHUB_DEFAULT_ASSIGNEE'] || '',
    },
  };
}

module.exports = load();
