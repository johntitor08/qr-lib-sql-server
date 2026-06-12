// server.js — Bibliotheca API

require("express-async-errors");
require("dotenv").config();

const path = require("path");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { getPool, closePool } = require("./db");

const booksRouter = require("./routes/books");
const highlightsRouter = require("./routes/highlights");
const loansRouter = require("./routes/loans");
const usersRouter = require("./routes/users");
const shelvesRouter = require("./routes/shelves");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, process.env.NODE_ENV !== "production");
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS engellendi: " + origin));
    },
    credentials: true,
  }),
);

// Frontend ağır biçimde inline script ve CDN kullandığından CSP kapalı.
app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.",
  },
});

app.use(apiLimiter);

app.use(compression());

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/books", booksRouter);
app.use("/api/v1/highlights", highlightsRouter);
app.use("/api/v1/loans", loansRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/shelves", shelvesRouter);

// ── Frontend (tek port dağıtımı) ───────────────────────────────────────────
// API ile aynı porttan statik arayüzü servis et. Sadece gerekli iki dosya
// açılır; diğer kaynak dosyalar (.env, routes/, db.js ...) servis edilmez.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "api.js"));
});

app.get("/api/health", async (req, res) => {
  const pool = await getPool();

  await pool.request().query("SELECT 1");

  res.json({
    status: "ok",
    database: "connected",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint bulunamadı",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production" ? "Sunucu hatası" : err.message,
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

let server;

async function start() {
  await getPool();

  server = app.listen(PORT, () => {
    console.log("🚀 Bibliotheca API çalışıyor: http://localhost:" + PORT);
  });
}

async function shutdown(signal) {
  console.log(`\n${signal} alındı, sunucu kapatılıyor...`);

  try {
    if (server) {
      server.close(async () => {
        try {
          await closePool();
          console.log("✅ MSSQL bağlantısı kapatıldı");
        } catch (err) {
          console.error(err);
        }

        process.exit(0);
      });
    } else {
      await closePool();
      process.exit(0);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("❌ Sunucu başlatılamadı:", err);
  process.exit(1);
});
