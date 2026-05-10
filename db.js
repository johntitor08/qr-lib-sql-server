// db.js — SQL Server bağlantısı
const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER,
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt:            process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  pool: {
    max: 10, min: 0, idleTimeoutMillis: 30000,
  },
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ SQL Server bağlandı');
  }
  return pool;
}

// Kısa yardımcı: sorgu çalıştır
async function query(strings, ...values) {
  const p = await getPool();
  const req = p.request();
  values.forEach((v, i) => req.input(`p${i}`, v));
  // Tagged template literal kullanımı:
  // query`SELECT * FROM books WHERE id = ${id}`
  const text = strings.reduce((acc, s, i) =>
    acc + s + (i < values.length ? `@p${i}` : ''), '');
  return req.query(text);
}

module.exports = { sql, getPool, query };
