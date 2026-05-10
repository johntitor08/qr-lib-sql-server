// routes/books.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sql, getPool } = require('../db');
const { requireAuth, requireApproved } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireApproved);

// GET /api/books — kullanıcının kitaplarını listele (pagination destekli)
// ?page=1&limit=50
router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
  const offset = (Math.max(parseInt(req.query.page) || 1, 1) - 1) * limit;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('uid',    sql.NVarChar, req.user.uid)
      .input('limit',  sql.Int,      limit)
      .input('offset', sql.Int,      offset)
      .query(`
        SELECT * FROM books WHERE user_id = @uid
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    const countResult = await pool.request()
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`SELECT COUNT(*) AS total FROM books WHERE user_id = @uid`);
    res.json({
      data:  result.recordset,
      total: countResult.recordset[0].total,
      limit,
      offset,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/books/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.NVarChar, req.params.id)
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`SELECT * FROM books WHERE id = @id AND user_id = @uid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(result.recordset[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/books — yeni kitap ekle
router.post('/', async (req, res) => {
  const {
    title, author, isbn, publisher, year, pages, genre, location,
    status, copies, language, rating, read_status, current_page,
    cover_url, buy_url, description, notes,
  } = req.body;

  if (!title || !author) return res.status(400).json({ error: 'Başlık ve yazar zorunlu' });

  const id = uuidv4();
  try {
    const pool = await getPool();
    await pool.request()
      .input('id',           sql.NVarChar, id)
      .input('user_id',      sql.NVarChar, req.user.uid)
      .input('title',        sql.NVarChar, title)
      .input('author',       sql.NVarChar, author)
      .input('isbn',         sql.NVarChar, isbn        || null)
      .input('publisher',    sql.NVarChar, publisher   || null)
      .input('year',         sql.Int,      year        || null)
      .input('pages',        sql.Int,      pages       || null)
      .input('genre',        sql.NVarChar, genre       || null)
      .input('location',     sql.NVarChar, location    || null)
      .input('status',       sql.NVarChar, status      || 'available')
      .input('copies',       sql.Int,      copies      || 1)
      .input('language',     sql.NVarChar, language    || 'Türkçe')
      .input('rating',       sql.TinyInt,  rating      || 0)
      .input('read_status',  sql.NVarChar, read_status || 'unread')
      .input('current_page', sql.Int,      current_page|| 0)
      .input('cover_url',    sql.NVarChar, cover_url   || null)
      .input('buy_url',      sql.NVarChar, buy_url     || null)
      .input('description',  sql.NVarChar, description || null)
      .input('notes',        sql.NVarChar, notes       || null)
      .query(`
        INSERT INTO books (
          id, user_id, title, author, isbn, publisher, year, pages,
          genre, location, status, copies, language, rating,
          read_status, current_page, cover_url, buy_url, description, notes
        ) VALUES (
          @id, @user_id, @title, @author, @isbn, @publisher, @year, @pages,
          @genre, @location, @status, @copies, @language, @rating,
          @read_status, @current_page, @cover_url, @buy_url, @description, @notes
        )
      `);

    // Eklenen kaydı döndür
    const inserted = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`SELECT * FROM books WHERE id = @id`);
    res.status(201).json(inserted.recordset[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/books/:id — güncelle
router.put('/:id', async (req, res) => {
  const {
    title, author, isbn, publisher, year, pages, genre, location,
    status, copies, language, rating, read_status, current_page,
    cover_url, buy_url, description, notes,
  } = req.body;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',           sql.NVarChar, req.params.id)
      .input('uid',          sql.NVarChar, req.user.uid)
      .input('title',        sql.NVarChar, title)
      .input('author',       sql.NVarChar, author)
      .input('isbn',         sql.NVarChar, isbn        || null)
      .input('publisher',    sql.NVarChar, publisher   || null)
      .input('year',         sql.Int,      year        || null)
      .input('pages',        sql.Int,      pages       || null)
      .input('genre',        sql.NVarChar, genre       || null)
      .input('location',     sql.NVarChar, location    || null)
      .input('status',       sql.NVarChar, status      || 'available')
      .input('copies',       sql.Int,      copies      || 1)
      .input('language',     sql.NVarChar, language    || 'Türkçe')
      .input('rating',       sql.TinyInt,  rating      || 0)
      .input('read_status',  sql.NVarChar, read_status || 'unread')
      .input('current_page', sql.Int,      current_page|| 0)
      .input('cover_url',    sql.NVarChar, cover_url   || null)
      .input('buy_url',      sql.NVarChar, buy_url     || null)
      .input('description',  sql.NVarChar, description || null)
      .input('notes',        sql.NVarChar, notes       || null)
      .query(`
        UPDATE books SET
          title = @title, author = @author, isbn = @isbn,
          publisher = @publisher, year = @year, pages = @pages,
          genre = @genre, location = @location, status = @status,
          copies = @copies, language = @language, rating = @rating,
          read_status = @read_status, current_page = @current_page,
          cover_url = @cover_url, buy_url = @buy_url,
          description = @description, notes = @notes,
          updated_at = GETDATE()
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/books/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.NVarChar, req.params.id)
      .input('uid', sql.NVarChar, req.user.uid)
      .query(`DELETE FROM books WHERE id = @id AND user_id = @uid`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
