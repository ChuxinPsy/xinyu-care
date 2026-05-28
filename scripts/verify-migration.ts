import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const SOURCE_URL = process.env.MIGRATE_SOURCE_SUPABASE_URL || '';
const SOURCE_SERVICE_KEY = process.env.MIGRATE_SOURCE_SERVICE_ROLE_KEY || '';
const STORAGE_ROOT = path.resolve(process.cwd(), process.env.MIGRATE_TARGET_STORAGE_ROOT || 'storage-data');
const REPORT_PATH = path.resolve(process.cwd(), 'specs/supabase-to-mysql-migration/verification-report.json');

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

async function countSource(table: (typeof TABLES)[number]) {
  const client = sourceClient();
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

async function countTarget(connection: mysql.Connection, table: string) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
  return Number((rows as Array<{ total: number }>)[0]?.total || 0);
}

async function countFiles(bucket: 'diary-images' | 'knowledge-documents') {
  const root = path.join(STORAGE_ROOT, bucket);
  try {
    const entries = await fs.readdir(root, { recursive: true, withFileTypes: true } as never);
    return entries.filter((entry: any) => entry.isFile()).length;
  } catch {
    return 0;
  }
}

async function main() {
  if (!SOURCE_URL || !SOURCE_SERVICE_KEY) {
    throw new Error('Missing MIGRATE_SOURCE_SUPABASE_URL or MIGRATE_SOURCE_SERVICE_ROLE_KEY');
  }

  const connection = await targetConnection();
  try {
    const sourceCounts = Object.fromEntries(await Promise.all(TABLES.map(async (table) => [table, await countSource(table)])));
    const targetCounts = Object.fromEntries(await Promise.all(TABLES.map(async (table) => [table, await countTarget(connection, table)])));

    const mismatches = TABLES
      .map((table) => ({ table, source: sourceCounts[table], target: targetCounts[table] }))
      .filter((item) => item.source !== item.target);

    const sourceProfiles = sourceCounts.profiles;
    const targetUsers = await countTarget(connection, 'users');
    if (targetUsers < sourceProfiles) {
      mismatches.push({ table: 'users', source: sourceProfiles, target: targetUsers });
    }

    const copiedFiles = {
      'diary-images': await countFiles('diary-images'),
      'knowledge-documents': await countFiles('knowledge-documents'),
    };

    const report = {
      verifiedAt: new Date().toISOString(),
      sourceCounts,
      targetCounts: {
        ...targetCounts,
        users: targetUsers,
      },
      copiedFiles,
      mismatches,
      ok: mismatches.length === 0,
    };

    await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    if (mismatches.length > 0) {
      throw new Error(`Verification failed: ${JSON.stringify(mismatches)}`);
    }

    process.stdout.write(`Verification completed. Report written to ${REPORT_PATH}\n`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
