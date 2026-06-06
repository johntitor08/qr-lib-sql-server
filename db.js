// db.js — SQL Server bağlantısı (production-ready)

const sql = require("mssql");
require("dotenv").config();

function mustGet(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const config = {
  server: mustGet("DB_SERVER"),
  port: parseInt(process.env.DB_PORT || "1433", 10),
  database: mustGet("DB_DATABASE"),
  user: mustGet("DB_USER"),
  password: mustGet("DB_PASSWORD"),

  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;
let connecting = null;

async function connectWithRetry(retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const p = await sql.connect(config);

      p.on("error", (err) => {
        console.error("❌ SQL Pool Error:", err);
        pool = null;
      });

      console.log("✅ SQL Server connected");
      return p;
    } catch (err) {
      console.error(
        "❌ DB connection failed (" + (i + 1) + "/" + retries + "):",
        err.message,
      );

      if (i === retries - 1) throw err;

      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function getPool() {
  if (pool) return pool;
  if (!connecting) {
    connecting = connectWithRetry()
      .then((p) => {
        pool = p;
        connecting = null;
        return p;
      })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }
  return connecting;
}

async function closePool() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("🧹 SQL Pool closed");
    }
  } catch (err) {
    console.error("❌ Error closing pool:", err.message);
  }
}

module.exports = {
  sql,
  getPool,
  closePool,
};
