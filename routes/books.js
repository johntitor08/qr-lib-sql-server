const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { sql, getPool } = require("../db");
const { requireAuth, requireApproved } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireApproved);

router.get("/", async (req, res) => {
  try {
    const limitRaw = parseInt(req.query.limit);
    const pageRaw = parseInt(req.query.page);

    const limit = Math.min(Number.isFinite(limitRaw) ? limitRaw : 50, 200);

    const page = Math.max(Number.isFinite(pageRaw) ? pageRaw : 1, 1);

    const offset = (page - 1) * limit;

    const pool = await getPool();

    const dataResult = await pool
      .request()
      .input("uid", sql.NVarChar, req.user.uid)
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset).query(`
        SELECT *
        FROM books
        WHERE user_id = @uid
        ORDER BY created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    const countResult = await pool
      .request()
      .input("uid", sql.NVarChar, req.user.uid).query(`
        SELECT COUNT(*) AS total
        FROM books
        WHERE user_id = @uid
      `);

    return res.json({
      data: dataResult.recordset,
      total: countResult.recordset[0].total,
      limit,
      page,
      offset,
    });
  } catch (err) {
    console.error("BOOKS_GET_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .input("uid", sql.NVarChar, req.user.uid).query(`
        SELECT *
        FROM books
        WHERE id = @id AND user_id = @uid
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        error: "Bulunamadı",
      });
    }

    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("BOOK_GET_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/", async (req, res) => {
  const title = req.body?.title?.trim();
  const author = req.body?.author?.trim();

  if (!title || !author) {
    return res.status(400).json({
      error: "Başlık ve yazar zorunlu",
    });
  }

  const id = uuidv4();

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("user_id", sql.NVarChar, req.user.uid)
      .input("title", sql.NVarChar, title)
      .input("author", sql.NVarChar, author)
      .input("isbn", sql.NVarChar, req.body?.isbn?.trim() || null)
      .input("publisher", sql.NVarChar, req.body?.publisher?.trim() || null)
      .input("year", sql.Int, req.body?.year || null)
      .input("pages", sql.Int, req.body?.pages || null)
      .input("genre", sql.NVarChar, req.body?.genre?.trim() || null)
      .input("location", sql.NVarChar, req.body?.location?.trim() || null)
      .input("status", sql.NVarChar, req.body?.status || "available")
      .input("copies", sql.Int, req.body?.copies || 1)
      .input("language", sql.NVarChar, req.body?.language || "Türkçe")
      .input("rating", sql.TinyInt, req.body?.rating || 0)
      .input("read_status", sql.NVarChar, req.body?.read_status || "unread")
      .input("current_page", sql.Int, req.body?.current_page || 0)
      .input("cover_url", sql.NVarChar, req.body?.cover_url?.trim() || null)
      .input("buy_url", sql.NVarChar, req.body?.buy_url?.trim() || null)
      .input("description", sql.NVarChar, req.body?.description?.trim() || null)
      .input("notes", sql.NVarChar, req.body?.notes?.trim() || null).query(`
        INSERT INTO books (
          id, user_id, title, author, isbn, publisher, year, pages,
          genre, location, status, copies, language, rating,
          read_status, current_page, cover_url, buy_url, description, notes
        )
        OUTPUT INSERTED.*
        VALUES (
          @id, @user_id, @title, @author, @isbn, @publisher, @year, @pages,
          @genre, @location, @status, @copies, @language, @rating,
          @read_status, @current_page, @cover_url, @buy_url, @description, @notes
        )
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("BOOK_CREATE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.put("/:id", async (req, res) => {
  const title = req.body?.title?.trim();
  const author = req.body?.author?.trim();

  if (!title || !author) {
    return res.status(400).json({
      error: "Başlık ve yazar zorunlu",
    });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .input("uid", sql.NVarChar, req.user.uid)
      .input("title", sql.NVarChar, title)
      .input("author", sql.NVarChar, author)
      .input("isbn", sql.NVarChar, req.body?.isbn || null)
      .input("publisher", sql.NVarChar, req.body?.publisher || null)
      .input("year", sql.Int, req.body?.year || null)
      .input("pages", sql.Int, req.body?.pages || null)
      .input("genre", sql.NVarChar, req.body?.genre || null)
      .input("location", sql.NVarChar, req.body?.location || null)
      .input("status", sql.NVarChar, req.body?.status || "available")
      .input("copies", sql.Int, req.body?.copies || 1)
      .input("language", sql.NVarChar, req.body?.language || "Türkçe")
      .input("rating", sql.TinyInt, req.body?.rating || 0)
      .input("read_status", sql.NVarChar, req.body?.read_status || "unread")
      .input("current_page", sql.Int, req.body?.current_page || 0)
      .input("cover_url", sql.NVarChar, req.body?.cover_url || null)
      .input("buy_url", sql.NVarChar, req.body?.buy_url || null)
      .input("description", sql.NVarChar, req.body?.description || null)
      .input("notes", sql.NVarChar, req.body?.notes || null).query(`
        UPDATE books
        SET
          title = @title,
          author = @author,
          isbn = @isbn,
          publisher = @publisher,
          year = @year,
          pages = @pages,
          genre = @genre,
          location = @location,
          status = @status,
          copies = @copies,
          language = @language,
          rating = @rating,
          read_status = @read_status,
          current_page = @current_page,
          cover_url = @cover_url,
          buy_url = @buy_url,
          description = @description,
          notes = @notes,
          updated_at = GETDATE()
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Bulunamadı",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("BOOK_UPDATE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .input("uid", sql.NVarChar, req.user.uid).query(`
        DELETE FROM books
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Bulunamadı",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("BOOK_DELETE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
