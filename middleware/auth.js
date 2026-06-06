// middleware/auth.js — JWT doğrulama (Firebase yok)
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Bearer token'ı doğrula, req.user'a yaz
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }
  try {
    const token = header.split('Bearer ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // req.user: { uid, email, iat, exp }
    next();
  } catch (e) {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

// Onaylı kullanıcı kontrolü
async function requireApproved(req, res, next) {
  if (req.user?.email === process.env.ADMIN_EMAIL) return next();
  try {
    const { getPool, sql } = require('../db');
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.user.uid)
      .query(`SELECT approved FROM users WHERE id = @id`);
    if (!result.recordset.length || !result.recordset[0].approved) {
      return res.status(403).json({ error: 'Hesabınız henüz onaylanmadı' });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: 'Yetki kontrolü başarısız' });
  }
}

// Sadece admin erişimi
function requireAdmin(req, res, next) {
  if (req.user?.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }
  next();
}

module.exports = { requireAuth, requireApproved, requireAdmin };
