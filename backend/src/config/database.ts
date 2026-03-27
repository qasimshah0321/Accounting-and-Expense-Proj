import mysql, { Pool, PoolConnection, Connection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from './env';

const dbConfig = {
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  connectTimeout: 10000,
};

export const pool: Pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
});

export const connectDB = async (): Promise<void> => {
  const conn = await mysql.createConnection(dbConfig);
  await conn.end();
  console.log('MySQL connected successfully');
};

export const withTransaction = async <T>(
  callback: (conn: Connection) => Promise<T>
): Promise<T> => {
  const conn = await mysql.createConnection(dbConfig);
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
};

export type { PoolConnection, Connection, RowDataPacket, ResultSetHeader };
