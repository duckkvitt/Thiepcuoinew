import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

dotenv.config();

const allowedTables = new Set([
  'invitations',
  'admins',
  'families',
  'gallery_images',
  'wedding_schedule',
  'wedding_locations',
  'invitees',
  'wishes',
  'rsvps'
]);
const deleteOrder = [
  'rsvps',
  'wishes',
  'invitees',
  'wedding_locations',
  'wedding_schedule',
  'gallery_images',
  'families',
  'admins',
  'invitations'
];
const insertOrder = [...deleteOrder].reverse();
const normalizeUploadUrl = (value) => value.replace(
  /^https?:\/\/(?:localhost|127\.0\.0\.1):8080(\/uploads\/)/i,
  '$1'
);
const normalizeValue = (value) => {
  if (typeof value === 'string') return normalizeUploadUrl(value);
  if (value !== null && typeof value === 'object' && !Buffer.isBuffer(value)) {
    return JSON.stringify(value, (_key, nestedValue) => (
      typeof nestedValue === 'string' ? normalizeUploadUrl(nestedValue) : nestedValue
    ));
  }
  return value;
};
const inputFile = resolve(process.argv[2] || 'deployment-data.json');
const payload = JSON.parse(await readFile(inputFile, 'utf8'));

if (payload?.formatVersion !== 1 || !payload.tables || typeof payload.tables !== 'object') {
  throw new Error('Deployment data file is invalid or unsupported.');
}
for (const table of Object.keys(payload.tables)) {
  if (!allowedTables.has(table) || !Array.isArray(payload.tables[table])) {
    throw new Error(`Deployment data contains an unsupported table: ${table}`);
  }
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '123456',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'thiep_cuoi_app',
  charset: 'utf8mb4'
});

try {
  await connection.beginTransaction();
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of deleteOrder) {
    if (payload.tables[table]) await connection.query(`DELETE FROM \`${table}\``);
  }

  for (const table of insertOrder) {
    const rows = payload.tables[table] || [];
    for (const row of rows) {
      const columns = Object.keys(row);
      if (!columns.length || columns.some((column) => !/^[a-zA-Z0-9_]+$/.test(column))) {
        throw new Error(`Deployment data contains invalid columns for ${table}.`);
      }
      const columnSql = columns.map((column) => `\`${column}\``).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      await connection.query(
        `INSERT INTO \`${table}\` (${columnSql}) VALUES (${placeholders})`,
        columns.map((column) => normalizeValue(row[column]))
      );
    }
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  await connection.commit();
  console.log(`Imported deployment data from ${inputFile}.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
