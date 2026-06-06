// middleware/auth.js — Hardened JWT Auth Layer

const jwt = require("jsonwebtoken");
const { getPool, sql } = require("../db");
require("dotenv").config();

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token gerekli" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // expected payload:
    // { uid, email, role }

    req.user = decoded;

    return next();
  } catch (err) {
    return res.status(401).json({
      error: "Geçersiz veya süresi dolmuş token",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Auth gerekli" });
  }

  const isAdmin =
    req.user.role === "admin" ||
    req.user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  if (!isAdmin) {
    return res.status(403).json({ error: "Admin gerekli" });
  }

  return next();
}

const approvalCache = new Map();
const CACHE_TTL = 60 * 1000;

/* periodic cleanup → memory leak fix */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of approvalCache.entries()) {
    if (value.expires < now) {
      approvalCache.delete(key);
    }
  }
}, 60 * 1000);

async function requireApproved(req, res, next) {
  try {
    // HARD GUARD
    if (!req.user) {
      return res.status(401).json({ error: "Auth gerekli" });
    }

    const userId = req.user.uid;

    if (!userId) {
      return res.status(401).json({ error: "Geçersiz token payload" });
    }

    const cached = approvalCache.get(userId);

    if (cached && cached.expires > Date.now()) {
      if (!cached.approved) {
        return res.status(403).json({ error: "Hesap onaylanmamış" });
      }

      return next();
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, userId)
      .query("SELECT approved FROM users WHERE id = @id");

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    const approved = !!result.recordset[0].approved;

    approvalCache.set(userId, {
      approved,
      expires: Date.now() + CACHE_TTL,
    });

    if (!approved) {
      return res.status(403).json({ error: "Hesap onaylanmamış" });
    }

    return next();
  } catch (err) {
    console.error("Approval check error:", err);

    return res.status(500).json({
      error: "Yetki kontrolü başarısız",
    });
  }
}

module.exports = {
  requireAuth,
  requireApproved,
  requireAdmin,
};
