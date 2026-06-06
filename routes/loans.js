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
        FROM loans
        WHERE user_id = @uid
        ORDER BY created_at DESC
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("LOANS_GET_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/", async (req, res) => {
  const {
    book_name,
    borrower_name,
    borrower_contact,
    lent_date,
    due_date,
    notes,
  } = req.body;

  if (!borrower_name?.trim()) {
    return res.status(400).json({
      error: "borrower_name zorunlu",
    });
  }

  const id = uuidv4();

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("uid", sql.NVarChar, req.user.uid)
      .input("book_name", sql.NVarChar, book_name?.trim() || null)
      .input("borrower_name", sql.NVarChar, borrower_name.trim())
      .input("borrower_contact", sql.NVarChar, borrower_contact?.trim() || null)
      .input("lent_date", sql.Date, lent_date ? new Date(lent_date) : null)
      .input("due_date", sql.Date, due_date ? new Date(due_date) : null)
      .input("notes", sql.NVarChar, notes?.trim() || null).query(`
        INSERT INTO loans (
          id,
          user_id,
          book_name,
          borrower_name,
          borrower_contact,
          lent_date,
          due_date,
          notes
        )
        OUTPUT INSERTED.*
        VALUES (
          @id,
          @uid,
          @book_name,
          @borrower_name,
          @borrower_contact,
          @lent_date,
          @due_date,
          @notes
        )
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("LOANS_CREATE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.patch("/:id/return", async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("uid", sql.NVarChar, req.user.uid).query(`
        UPDATE loans
        SET returned_date = CAST(GETDATE() AS DATE)
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Kayıt bulunamadı",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("LOANS_RETURN_ERROR:", err);
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
        DELETE FROM loans
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Kayıt bulunamadı",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("LOANS_DELETE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
