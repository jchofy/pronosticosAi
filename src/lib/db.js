import 'dotenv/config';
import mysql from 'mysql2/promise';

const {
  DB_HOST = '79.72.55.174',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '7oLiW3J682DOsZXQpOOe4QCuycmOg5E5wUH8GbLAtM730EdPWHUl7aqMwdFeRBdQ',
  DB_NAME = 'AiPredictions',
} = process.env;

let pool;

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 10,
      waitForConnections: true,
      dateStrings: true, // return dates as strings to avoid TZ shifts
      timezone: 'Z',
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};

export const query = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const healthCheck = async () => {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}; 