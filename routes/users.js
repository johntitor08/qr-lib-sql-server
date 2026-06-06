const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sql, getPool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const SALT_ROUNDS = 12;
const JWT_EXPIRES = "7d";

function isAdminEmail(email) {
  return email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
}

function makeToken(user) {
  return jwt.sign(
    {
      uid: user.id,
      email: user.email,
      role: user.role || "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email ve şifre zorunlu" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Şifre en az 8 karakter olmalı" });
  }

  try {
    const pool = await getPool();

    const existing = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM users WHERE email = @email");

    if (existing.recordset.length) {
      return res.status(409).json({ error: "Bu e-posta zaten kayıtlı" });
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const role = isAdminEmail(email) ? "admin" : "user";
    const approved = role === "admin" ? 1 : 0;

    await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("email", sql.NVarChar, email)
      .input("password_hash", sql.NVarChar, hash)
      .input("approved", sql.Bit, approved).query(`
        INSERT INTO users (id, email, password_hash, approved)
        VALUES (@id, @email, @password_hash, @approved)
      `);

    if (role === "admin") {
      return res.status(201).json({
        token: makeToken({ id, email, role }),
        email,
        approved: true,
      });
    }

    return res.status(201).json({
      approved: false,
      message: "Kayıt alındı. Admin onayı bekleniyor.",
    });
  } catch (err) {
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email ve şifre zorunlu" });
  }

  try {
    const pool = await getPool();

    const result = await pool.request().input("email", sql.NVarChar, email)
      .query(`
        SELECT id, email, password_hash, approved
        FROM users WHERE email = @email
      `);

    if (!result.recordset.length) {
      return res.status(401).json({ error: "Geçersiz giriş" });
    }

    const user = result.recordset[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Geçersiz giriş" });
    }

    const role = isAdminEmail(user.email) ? "admin" : "user";

    if (!user.approved && role !== "admin") {
      return res.status(403).json({ error: "Hesap henüz onaylanmadı" });
    }

    return res.json({
      token: makeToken({
        id: user.id,
        email: user.email,
        role,
      }),
      email: user.email,
      approved: user.approved === 1,
    });
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.use(requireAuth);

router.get("/me", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().input("id", sql.NVarChar, req.user.uid)
      .query(`
        SELECT id, email, approved, created_at
        FROM users WHERE id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("ME_ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/all", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("adminEmail", sql.NVarChar, process.env.ADMIN_EMAIL).query(`
        SELECT id, email, approved, created_at
        FROM users
        WHERE email != @adminEmail
        ORDER BY created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("ALL_USERS_ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.patch("/:id/approve", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();

    await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .query("UPDATE users SET approved = 1 WHERE id = @id");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.patch("/:id/revoke", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();

    await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .query("UPDATE users SET approved = 0 WHERE id = @id");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();

    await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .query("DELETE FROM users WHERE id = @id");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
