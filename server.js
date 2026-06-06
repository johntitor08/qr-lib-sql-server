// server.js — Ana sunucu (Firebase yok)
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getPool, closePool } = require("./db");
const booksRouter = require("./routes/books");
const highlightsRouter = require("./routes/highlights");
const loansRouter = require("./routes/loans");
const usersRouter = require("./routes/users");
const shelvesRouter = require("./routes/shelves");

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, process.env.NODE_ENV !== "production");
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: ${origin} izin listesinde yok`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

// ── Rotalar ──────────────────────────────────────────────────
app.use("/api/books", booksRouter);
app.use("/api/highlights", highlightsRouter);
app.use("/api/loans", loansRouter);
app.use("/api/users", usersRouter);
app.use("/api/shelves", shelvesRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ── Global hata yakalayıcı ────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Sunucu hatası" });
});

// ── Başlat ───────────────────────────────────────────────────
async function start() {
  await getPool();
  app.listen(PORT, () => {
    console.log(`🚀 Bibliotheca API çalışıyor: http://localhost:${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`\n${signal} alındı, kapatılıyor...`);
  try {
    await closePool();
  } catch (_) {}
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("❌ Sunucu başlatılamadı:", err.message);
  process.exit(1);
});
