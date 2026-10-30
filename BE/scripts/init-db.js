import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

dotenv.config();

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(resolve(here, 'schema.sql'), 'utf8');
const database = process.env.DB_NAME || 'thiep_cuoi_app';
if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('DB_NAME chỉ được chứa chữ, số và dấu gạch dưới.');
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  multipleStatements: true,
  charset: 'utf8mb4'
});

try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE \`${database}\`; ${sql}`);
  await connection.query(`
    DELETE older FROM families older
    JOIN families newer ON older.invitation_id = newer.invitation_id AND older.side = newer.side AND older.id < newer.id;
    DELETE older FROM gallery_images older
    JOIN gallery_images newer ON older.invitation_id = newer.invitation_id AND older.display_order = newer.display_order AND older.id < newer.id;
    DELETE older FROM wedding_schedule older
    JOIN wedding_schedule newer ON older.invitation_id = newer.invitation_id AND older.display_order = newer.display_order AND older.id < newer.id;
  `);

  const ensureUniqueIndex = async (table, indexName, columns) => {
    const [[row]] = await connection.query(
      `SELECT COUNT(*) AS count FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
      [database, table, indexName]
    );
    if (!Number(row.count)) {
      await connection.query(`ALTER TABLE \`${table}\` ADD UNIQUE KEY \`${indexName}\` (${columns.map((column) => `\`${column}\``).join(', ')})`);
    }
  };

  await ensureUniqueIndex('families', 'uq_families_invitation_side', ['invitation_id', 'side']);
  await ensureUniqueIndex('gallery_images', 'uq_gallery_invitation_order', ['invitation_id', 'display_order']);
  await ensureUniqueIndex('wedding_schedule', 'uq_schedule_invitation_order', ['invitation_id', 'display_order']);
  console.log(`Database ${database} is ready.`);
} finally {
  await connection.end();
}
