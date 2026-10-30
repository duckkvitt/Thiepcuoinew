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
  console.log(`Database ${database} is ready.`);
} finally {
  await connection.end();
}
