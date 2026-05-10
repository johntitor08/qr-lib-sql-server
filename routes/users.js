// routes/users.js — Kayıt / giriş / admin (Firebase yok)
const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sql, getPool } = require('../db');
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 12;
const JWT_EXPIRES = '7d';

function makeToken(user) {
  return jwt.sign(
    { uid: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── Açık rotalar (auth gerekmez) ────────────────────────────

// POST /api/users/register — yeni kullanıcı kaydı
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-posta ve şifre zorunlu' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`SELECT id FROM users WHERE email = @email`);
    if (existing.recordset.length) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });

    const id       = uuidv4();
    const hash     = await bcrypt.hash(password, SALT_ROUNDS);
    const isAdmin  = email === process.env.ADMIN_EMAIL;

    await pool.request()
      .input('id',           sql.NVarChar, id)
      .input('email',        sql.NVarChar, email)
      .input('password_hash',sql.NVarChar, hash)
      .input('approved',     sql.Bit,      isAdmin ? 1 : 0)
      .query(`INSERT INTO users (id, email, password_hash, approved) VALUES (@id, @email, @password_hash, @approved)`);

    if (isAdmin) {
      const user = { id, email };
      return res.status(201).json({ token: makeToken(user), approved: true });
    }
    res.status(201).json({ approved: false, message: 'Kayıt alındı. Admin onayından sonra giriş yapabilirsiniz.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/login — giriş
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-posta ve şifre zorunlu' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`SELECT id, email, password_hash, approved FROM users WHERE email = @email`);

    if (!result.recordset.length) return res.status(401).json({ error: 'Yanlış e-posta veya şifre' });

    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Yanlış e-posta veya şifre' });

    if (!user.approved && user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Hesabınız henüz onaylanmadı' });
    }

    res.json({ token: makeToken(user), email: user.email, approved: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Korumalı rotalar ────────────────────────────────────────
router.use(requireAuth);

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.user.uid)
      .query(`SELECT id, email, approved, created_at FROM users WHERE id = @id`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin rotaları ──────────────────────────────────────────
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('adminEmail', sql.NVarChar, process.env.ADMIN_EMAIL)
      .query(`SELECT id, email, approved, created_at FROM users WHERE email != @adminEmail ORDER BY created_at DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE users SET approved = 1 WHERE id = @id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE users SET approved = 0 WHERE id = @id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`DELETE FROM users WHERE id = @id`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
