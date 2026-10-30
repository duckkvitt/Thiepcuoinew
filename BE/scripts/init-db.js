import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

dotenv.config();

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(resolve(here, 'schema.sql'), 'utf8');
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'thiep_cuoi_app';
if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('DB_NAME chỉ được chứa chữ, số và dấu gạch dưới.');
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '123456',
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

  const ensureColumn = async (table, column, definition) => {
    const [[row]] = await connection.query(
      `SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
      [database, table, column]
    );
    if (!Number(row.count)) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  };

  await ensureColumn('invitations', 'invitation_heading', "VARCHAR(150) NOT NULL DEFAULT 'Thông tin lễ cưới'");
  await ensureColumn('invitations', 'announcement_text', "VARCHAR(500) NOT NULL DEFAULT 'TRÂN TRỌNG BÁO TIN\\nLỄ THÀNH HÔN CỦA CON CHÚNG TÔI'");
  await ensureColumn('invitations', 'groom_role', "VARCHAR(100) NOT NULL DEFAULT 'TRƯỞNG NAM'");
  await ensureColumn('invitations', 'bride_role', "VARCHAR(100) NOT NULL DEFAULT 'ÚT NỮ'");
  await ensureColumn('invitations', 'ceremony_intro', "VARCHAR(255) NOT NULL DEFAULT 'LỄ THÀNH HÔN ĐƯỢC CỬ HÀNH TẠI'");
  await ensureColumn('invitations', 'ceremony_venue', "VARCHAR(200) NOT NULL DEFAULT 'TƯ GIA'");
  await ensureColumn('invitations', 'music_url', "VARCHAR(500) NOT NULL DEFAULT ''");
  await ensureColumn('invitations', 'music_title', "VARCHAR(150) NOT NULL DEFAULT ''");
  await ensureColumn('invitations', 'music_enabled', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('invitations', 'music_volume', 'DECIMAL(3,2) NOT NULL DEFAULT 0.35');
  await ensureColumn('invitations', 'typography_settings', 'JSON NULL');

  const adminUsername = String(process.env.ADMIN_USERNAME || '').trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  if (adminUsername && adminPassword) {
    const [[existingAdmin]] = await connection.query('SELECT id FROM admins WHERE username = ? LIMIT 1', [adminUsername]);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await connection.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [adminUsername, passwordHash]);
    }
  }
  console.log(`Database ${database} is ready.`);
} finally {
  await connection.end();
}
