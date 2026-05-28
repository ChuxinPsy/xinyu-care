import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

type JsonRecord = Record<string, unknown>;

const SOURCE_URL = process.env.MIGRATE_SOURCE_SUPABASE_URL || '';
const SOURCE_SERVICE_KEY = process.env.MIGRATE_SOURCE_SERVICE_ROLE_KEY || '';
const STORAGE_ROOT = path.resolve(process.cwd(), process.env.MIGRATE_TARGET_STORAGE_ROOT || 'storage-data');
const STORAGE_PUBLIC_BASE_URL =
  process.env.MIGRATE_PUBLIC_STORAGE_BASE_URL || 'http://localhost:8088/api/storage/public';
const RESET_TARGET = /^(1|true|yes)$/i.test(process.env.MIGRATE_RESET_TARGET || '');

const TABLES = [
  'profiles',
  'emotion_diaries',
  'assessments',
  'wearable_data',
  'healing_contents',
  'user_healing_records',
  'community_posts',
  'community_comments',
  'post_likes',
  'doctor_patients',
  'risk_alerts',
  'knowledge_base',
  'meditation_sessions',
  'user_favorites',
  'post_categories',
  'doctor_verification_codes',
] as const;

const INSERT_ORDER = [
  'users',
  'profiles',
  'post_categories',
  'healing_contents',
  'doctor_verification_codes',
  'emotion_diaries',
  'assessments',
  'wearable_data',
  'community_posts',
  'community_comments',
  'post_likes',
  'doctor_patients',
  'risk_alerts',
  'knowledge_base',
  'user_healing_records',
  'meditation_sessions',
  'user_favorites',
] as const;

const RESET_ORDER = [...INSERT_ORDER].reverse();

const JSON_COLUMNS = new Set([
  'metadata',
  'tags',
  'image_urls',
  'ai_analysis',
  'conversation_history',
  'report',
  'data_json',
]);

const DATETIME_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'used_at',
  'handled_at',
  'last_login_at',
]);

const DATE_COLUMNS = new Set([
  'birth_date',
  'record_date',
  'diary_date',
]);

const USER_REFERENCE_COLUMNS = [
  'id',
  'user_id',
  'doctor_id',
  'patient_id',
  'handled_by',
  'created_by',
  'used_by',
] as const;

const URL_REWRITE_COLUMNS: Record<string, string[]> = {
  profiles: ['avatar_url', 'background_url'],
  emotion_diaries: ['voice_url'],
  assessments: ['voice_input_url', 'image_input_url', 'video_input_url'],
  healing_contents: ['content_url', 'thumbnail_url'],
  knowledge_base: ['file_url'],
};

const BUCKET_COLUMNS = [
  { bucket: 'diary-images', table: 'profiles', columns: ['avatar_url', 'background_url'] },
  { bucket: 'diary-images', table: 'emotion_diaries', columns: ['voice_url'] },
  { bucket: 'diary-images', table: 'assessments', columns: ['voice_input_url', 'image_input_url', 'video_input_url'] },
  { bucket: 'diary-images', table: 'healing_contents', columns: ['content_url', 'thumbnail_url'] },
  { bucket: 'knowledge-documents', table: 'knowledge_base', columns: ['file_url'] },
] as const;

const IMPORT_REPORT_PATH = path.resolve(
  process.cwd(),
  'specs/supabase-to-mysql-migration/import-report.json'
);

function assertEnv() {
  if (!SOURCE_URL || !SOURCE_SERVICE_KEY) {
    throw new Error('Missing MIGRATE_SOURCE_SUPABASE_URL or MIGRATE_SOURCE_SERVICE_ROLE_KEY');
  }
}

function sourceClient() {
  return createClient(SOURCE_URL, SOURCE_SERVICE_KEY, { auth: { persistSession: false } });
}

function resolveMysqlConnectionUri() {
  const direct =
    process.env.MIGRATE_TARGET_MYSQL_URL ||
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL ||
    '';
  if (direct) {
    return direct;
  }

  const jdbc = process.env.DB_URL || '';
  if (jdbc.startsWith('jdbc:mysql://')) {
    const withoutJdbc = jdbc.replace(/^jdbc:/, '');
    const [main] = withoutJdbc.split('?');
    const parsed = new URL(main);
    const username = encodeURIComponent(process.env.MIGRATE_TARGET_DB_USERNAME || process.env.DB_USERNAME || 'xinyu_care');
    const password = encodeURIComponent(process.env.MIGRATE_TARGET_DB_PASSWORD || process.env.DB_PASSWORD || 'xinyu_care_dev');
    return `mysql://${username}:${password}@${parsed.hostname}:${parsed.port || '3306'}${parsed.pathname}`;
  }

  const host = process.env.MIGRATE_TARGET_DB_HOST || '127.0.0.1';
  const port = process.env.MIGRATE_TARGET_DB_PORT || '3306';
  const database = process.env.MIGRATE_TARGET_DB_NAME || 'xinyu_care';
  const username = encodeURIComponent(process.env.MIGRATE_TARGET_DB_USERNAME || process.env.DB_USERNAME || 'xinyu_care');
  const password = encodeURIComponent(process.env.MIGRATE_TARGET_DB_PASSWORD || process.env.DB_PASSWORD || 'xinyu_care_dev');
  return `mysql://${username}:${password}@${host}:${port}/${database}`;
}

async function targetConnection() {
  return mysql.createConnection(resolveMysqlConnectionUri());
}

async function fetchTableRows(table: (typeof TABLES)[number]) {
  const client = sourceClient();
  const allRows: JsonRecord[] = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await client.from(table).select('*').order('id', { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as JsonRecord[];
    if (rows.length === 0) {
      break;
    }
    allRows.push(...rows);
    if (rows.length < pageSize) {
      break;
    }
    offset += pageSize;
  }
  return allRows;
}

function toMysqlDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function toMysqlDate(value: unknown) {
  if (typeof value !== 'string' || !value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function normalizeColumnValue(column: string, value: unknown) {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (JSON_COLUMNS.has(column)) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (DATETIME_COLUMNS.has(column)) {
    return toMysqlDateTime(value);
  }
  if (DATE_COLUMNS.has(column)) {
    return toMysqlDate(value);
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  }
  return value;
}

function publicUrl(bucket: string, relativePath: string) {
  return `${STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '')}/${bucket}/${relativePath.replace(/^\/+/, '')}`;
}

function extractBucketRelativePath(raw: unknown, bucket: string) {
  if (typeof raw !== 'string' || !raw) return null;
  const marker = `/object/public/${bucket}/`;
  if (raw.includes(marker)) {
    return raw.split(marker)[1] || null;
  }
  const publicMarker = `/${bucket}/`;
  if (raw.startsWith(`${bucket}/`)) {
    return raw.slice(bucket.length + 1);
  }
  if (raw.includes(publicMarker)) {
    return raw.split(publicMarker).slice(1).join(publicMarker);
  }
  return null;
}

function rewriteStorageUrls(table: string, row: JsonRecord) {
  const next = { ...row };
  const columns = URL_REWRITE_COLUMNS[table];
  if (!columns) return next;

  for (const { bucket, table: targetTable, columns: targetColumns } of BUCKET_COLUMNS) {
    if (targetTable !== table) continue;
    for (const column of targetColumns) {
      const relativePath = extractBucketRelativePath(next[column], bucket);
      if (relativePath) {
        next[column] = bucket === 'knowledge-documents' ? relativePath : publicUrl(bucket, relativePath);
      }
    }
  }

  return next;
}

function collectReferencedUserIds(allTables: Record<string, JsonRecord[]>) {
  const ids = new Set<string>();
  for (const rows of Object.values(allTables)) {
    for (const row of rows) {
      for (const column of USER_REFERENCE_COLUMNS) {
        const value = row[column];
        if (typeof value === 'string' && value) {
          ids.add(value);
        }
      }
    }
  }
  return ids;
}

function dedupeValue(base: string, used: Set<string>, suffix = 1): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  return dedupeValue(`${base}_${suffix}`, used, suffix + 1);
}

function buildUsers(profiles: JsonRecord[], allTables: Record<string, JsonRecord[]>) {
  const profileById = new Map<string, JsonRecord>();
  for (const profile of profiles) {
    if (typeof profile.id === 'string') {
      profileById.set(profile.id, profile);
    }
  }

  const usernames = new Set<string>();
  const emails = new Set<string>();
  const users: JsonRecord[] = [];

  for (const id of collectReferencedUserIds(allTables)) {
    const profile = profileById.get(id) || {};
    const role = ['user', 'doctor', 'admin'].includes(String(profile.role || '')) ? String(profile.role) : 'user';
    const usernameBase = String(profile.username || `migrated_${id.slice(0, 8)}`).replace(/\s+/g, '_');
    const emailBase = typeof profile.email === 'string' && profile.email
      ? profile.email
      : `migrated_${id}@placeholder.local`;

    const username = dedupeValue(usernameBase, usernames);
    const email = dedupeValue(emailBase, emails);
    const createdAt = profile.created_at || new Date().toISOString();
    const updatedAt = profile.updated_at || createdAt;

    users.push({
      id,
      username,
      email,
      password_hash: '!reset-required!',
      role,
      status: 'active',
      metadata: {
        migrated_from_supabase: true,
        password_reset_required: true,
        original_profile_email: profile.email || null,
      },
      created_at: createdAt,
      updated_at: updatedAt,
      last_login_at: null,
    });

    if (!profileById.has(id)) {
      profiles.push({
        id,
        username,
        email,
        role,
        phone: null,
        wechat: null,
        avatar_url: null,
        full_name: null,
        gender: null,
        birth_date: null,
        bio: null,
        background_url: null,
        selected_background: null,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      profileById.set(id, profiles[profiles.length - 1]);
    }
  }

  return users;
}

async function resetTarget(connection: mysql.Connection) {
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of RESET_ORDER) {
    await connection.execute(`TRUNCATE TABLE \`${table}\``);
  }
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
}

async function upsertRow(connection: mysql.Connection, table: string, row: JsonRecord) {
  const columns = Object.keys(row);
  if (columns.length === 0) return;
  const normalized = columns.map((column) => normalizeColumnValue(column, row[column]));
  const assignments = columns
    .filter((column) => column !== 'id')
    .map((column) => `\`${column}\` = VALUES(\`${column}\`)`)
    .join(', ');

  const sql = `
    INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
    ${assignments ? `ON DUPLICATE KEY UPDATE ${assignments}` : ''}
  `;
  await connection.execute(sql, normalized);
}

async function writeRows(connection: mysql.Connection, table: string, rows: JsonRecord[]) {
  for (const row of rows) {
    await upsertRow(connection, table, row);
  }
}

async function listBucketFiles(bucket: string) {
  const client = sourceClient();
  const files: string[] = [];
  const queue = [''];

  while (queue.length > 0) {
    const prefix = queue.shift() || '';
    let offset = 0;
    const pageSize = 100;
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const entries = data || [];
      for (const entry of entries) {
        const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const isFolder = !entry.id && !entry.metadata;
        if (isFolder) {
          queue.push(entryPath);
        } else {
          files.push(entryPath);
        }
      }
      if (entries.length < pageSize) {
        break;
      }
      offset += pageSize;
    }
  }

  return files.sort();
}

async function copyBucket(bucket: 'diary-images' | 'knowledge-documents') {
  const client = sourceClient();
  const files = await listBucketFiles(bucket);
  const destinationRoot = path.join(STORAGE_ROOT, bucket);
  await fs.mkdir(destinationRoot, { recursive: true });

  for (const relativePath of files) {
    const { data, error } = await client.storage.from(bucket).download(relativePath);
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());
    const destinationPath = path.join(destinationRoot, relativePath);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, buffer);
  }

  return files.length;
}

async function main() {
  assertEnv();

  const sourceTables = Object.fromEntries(await Promise.all(TABLES.map(async (table) => [table, await fetchTableRows(table)]))) as Record<string, JsonRecord[]>;

  const transformedProfiles = sourceTables.profiles.map((row) => rewriteStorageUrls('profiles', row));
  sourceTables.profiles = transformedProfiles;

  const users = buildUsers(sourceTables.profiles, sourceTables);
  const transformedTables: Record<string, JsonRecord[]> = {
    users,
    profiles: sourceTables.profiles,
    post_categories: sourceTables.post_categories,
    healing_contents: sourceTables.healing_contents.map((row) => rewriteStorageUrls('healing_contents', row)),
    doctor_verification_codes: sourceTables.doctor_verification_codes,
    emotion_diaries: sourceTables.emotion_diaries.map((row) => rewriteStorageUrls('emotion_diaries', row)),
    assessments: sourceTables.assessments.map((row) => rewriteStorageUrls('assessments', row)),
    wearable_data: sourceTables.wearable_data,
    community_posts: sourceTables.community_posts,
    community_comments: sourceTables.community_comments,
    post_likes: sourceTables.post_likes,
    doctor_patients: sourceTables.doctor_patients,
    risk_alerts: sourceTables.risk_alerts,
    knowledge_base: sourceTables.knowledge_base.map((row) => rewriteStorageUrls('knowledge_base', row)),
    user_healing_records: sourceTables.user_healing_records,
    meditation_sessions: sourceTables.meditation_sessions,
    user_favorites: sourceTables.user_favorites,
  };

  const connection = await targetConnection();
  try {
    if (RESET_TARGET) {
      await resetTarget(connection);
    }

    for (const table of INSERT_ORDER) {
      await writeRows(connection, table, transformedTables[table] || []);
    }
  } finally {
    await connection.end();
  }

  const copiedDiaryImages = await copyBucket('diary-images');
  const copiedKnowledgeDocuments = await copyBucket('knowledge-documents');

  const report = {
    migratedAt: new Date().toISOString(),
    resetTarget: RESET_TARGET,
    targetStorageRoot: STORAGE_ROOT,
    targetStoragePublicBaseUrl: STORAGE_PUBLIC_BASE_URL,
    tableCounts: Object.fromEntries(
      Object.entries(transformedTables).map(([table, rows]) => [table, rows.length])
    ),
    copiedFiles: {
      'diary-images': copiedDiaryImages,
      'knowledge-documents': copiedKnowledgeDocuments,
    },
    importedUsersRequiringPasswordReset: users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    })),
  };

  await fs.mkdir(path.dirname(IMPORT_REPORT_PATH), { recursive: true });
  await fs.writeFile(IMPORT_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`Migration completed. Report written to ${IMPORT_REPORT_PATH}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
