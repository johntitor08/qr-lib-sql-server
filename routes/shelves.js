// routes/shelves.js
const express = require('express');
const { sql, getPool } = require('../db');
const { requireAuth, requireApproved } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireApproved);

// GET /api/shelves
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`SELECT * FROM shelves WHERE user_id = @uid ORDER BY code`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/shelves
router.post('/', async (req, res) => {
  const { code, name } = req.body;
  if (!code) return res.status(400).json({ error: 'code zorunlu' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('uid',  sql.NVarChar, req.user.uid)
      .input('code', sql.NVarChar, code.trim())
      .input('name', sql.NVarChar, name?.trim() || null)
      .query(`INSERT INTO shelves (user_id, code, name) VALUES (@uid, @code, @name)`);
    const r = await pool.request()
      .input('uid',  sql.NVarChar, req.user.uid)
      .input('code', sql.NVarChar, code.trim())
      .query(`SELECT * FROM shelves WHERE user_id = @uid AND code = @code`);
    res.status(201).json(r.recordset[0]);
  } catch (e) {
    // Duplicate key
    if (e.number === 2627 || e.number === 2601) {
      return res.status(409).json({ error: 'Bu raf kodu zaten mevcut' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/shelves/:id
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',   sql.Int,      req.params.id)
      .input('uid',  sql.NVarChar, req.user.uid)
      .input('name', sql.NVarChar, name?.trim() || null)
      .query(`UPDATE shelves SET name = @name WHERE id = @id AND user_id = @uid`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/shelves/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int,      req.params.id)
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`DELETE FROM shelves WHERE id = @id AND user_id = @uid`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
