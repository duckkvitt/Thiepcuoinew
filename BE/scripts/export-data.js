import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

dotenv.config();

const knownTables = [
  'invitations',
  'admins',
  'families',
  'gallery_images',
  'wedding_schedule',
  'wedding_locations',
  'invitees',
  'wishes',
  'rsvps'
];

const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'thiep_cuoi_app';
const outputFile = resolve(process.argv[2] || 'deployment-data.json');
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '123456',
  database,
  charset: 'utf8mb4',
  dateStrings: true
});

try {
  const [tableRows] = await connection.query(
    'SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = ?',
    [database]
  );
  const existingTables = new Set(tableRows.map((row) => row.tableName));
  const tables = {};

  for (const table of knownTables) {
    if (!existingTables.has(table)) continue;
    const [rows] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY id`);
    tables[table] = rows;
  }

  await writeFile(
    outputFile,
    JSON.stringify({ formatVersion: 1, database, exportedAt: new Date().toISOString(), tables }),
    { encoding: 'utf8', mode: 0o600 }
  );
  console.log(`Exported ${Object.keys(tables).length} tables to ${outputFile}.`);
} finally {
  await connection.end();
}
