// routes/highlights.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sql, getPool } = require('../db');
const { requireAuth, requireApproved } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireApproved);

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`SELECT * FROM highlights WHERE user_id = @uid ORDER BY created_at DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { book_id, text, page, type } = req.body;
  if (!text || !book_id) return res.status(400).json({ error: 'book_id ve text zorunlu' });
  const id = uuidv4();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id',      sql.NVarChar, id)
      .input('uid',     sql.NVarChar, req.user.uid)
      .input('book_id', sql.NVarChar, book_id)
      .input('text',    sql.NVarChar, text)
      .input('page',    sql.Int,      page || null)
      .input('type',    sql.NVarChar, type || 'quote')
      .query(`INSERT INTO highlights (id,user_id,book_id,text,page,type)
              VALUES (@id,@uid,@book_id,@text,@page,@type)`);
    const r = await pool.request().input('id', sql.NVarChar, id)
      .query(`SELECT * FROM highlights WHERE id = @id`);
    res.status(201).json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.NVarChar, req.params.id)
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`DELETE FROM highlights WHERE id = @id AND user_id = @uid`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
