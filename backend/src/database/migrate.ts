import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const useSSL = process.env.DB_SSL === 'true';

export const runMigrations = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'erp_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
    multipleStatements: true,
  });
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let applied = 0;
    for (const file of files) {
      const [rows] = await conn.query('SELECT id FROM schema_migrations WHERE filename=?', [file]);
      if ((rows as any[]).length) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`  [migrate] applying: ${file}`);
      await conn.beginTransaction();
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      await conn.commit();
      applied++;
    }
    if (applied > 0) console.log(`  [migrate] ${applied} migration(s) applied.`);
    else console.log('  [migrate] All migrations already applied.');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
};

// Allow running directly: ts-node src/database/migrate.ts
if (require.main === module) {
  runMigrations()
    .then(() => { console.log('Migrations complete.'); process.exit(0); })
    .catch(err => { console.error('Migration failed:', err); process.exit(1); });
}
