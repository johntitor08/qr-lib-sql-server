const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { sql, getPool } = require("../db");
const { requireAuth, requireApproved } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireApproved);

router.get("/", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().input("uid", sql.NVarChar, req.user.uid)
      .query(`
        SELECT *
        FROM highlights
        WHERE user_id = @uid
        ORDER BY created_at DESC
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("HIGHLIGHTS_GET_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/", async (req, res) => {
  const book_id = req.body?.book_id?.trim();
  const text = req.body?.text?.trim();
  const page = Number.isFinite(req.body?.page) ? req.body.page : null;
  const type = req.body?.type?.trim() || "quote";

  if (!book_id || !text) {
    return res.status(400).json({
      error: "book_id ve text zorunlu",
    });
  }

  const id = uuidv4();

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("uid", sql.NVarChar, req.user.uid)
      .input("book_id", sql.NVarChar, book_id)
      .input("text", sql.NVarChar, text)
      .input("page", sql.Int, page)
      .input("type", sql.NVarChar, type).query(`
        INSERT INTO highlights (
          id,
          user_id,
          book_id,
          text,
          page,
          type
        )
        OUTPUT INSERTED.*
        VALUES (
          @id,
          @uid,
          @book_id,
          @text,
          @page,
          @type
        )
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("HIGHLIGHTS_CREATE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("uid", sql.NVarChar, req.user.uid).query(`
        DELETE FROM highlights
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Bulunamadı",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("HIGHLIGHTS_DELETE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
