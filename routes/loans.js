// routes/loans.js
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
      .query(`SELECT * FROM loans WHERE user_id = @uid ORDER BY created_at DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { book_name, borrower_name, borrower_contact, lent_date, due_date, notes } = req.body;
  if (!borrower_name) return res.status(400).json({ error: 'borrower_name zorunlu' });
  const id = uuidv4();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id',               sql.NVarChar, id)
      .input('uid',              sql.NVarChar, req.user.uid)
      .input('book_name',        sql.NVarChar, book_name        || null)
      .input('borrower_name',    sql.NVarChar, borrower_name)
      .input('borrower_contact', sql.NVarChar, borrower_contact || null)
      .input('lent_date',        sql.Date,     lent_date        || null)
      .input('due_date',         sql.Date,     due_date         || null)
      .input('notes',            sql.NVarChar, notes            || null)
      .query(`INSERT INTO loans (id,user_id,book_name,borrower_name,borrower_contact,lent_date,due_date,notes)
              VALUES (@id,@uid,@book_name,@borrower_name,@borrower_contact,@lent_date,@due_date,@notes)`);
    const r = await pool.request().input('id', sql.NVarChar, id)
      .query(`SELECT * FROM loans WHERE id = @id`);
    res.status(201).json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// İade et
router.patch('/:id/return', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id',  sql.NVarChar, req.params.id)
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`UPDATE loans SET returned_date = CAST(GETDATE() AS DATE)
              WHERE id = @id AND user_id = @uid`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id',  sql.NVarChar, req.params.id)
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`DELETE FROM loans WHERE id = @id AND user_id = @uid`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
