const express = require("express");
const { sql, getPool } = require("../db");
const { requireAuth, requireApproved } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireApproved);

router.get("/", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().input("uid", sql.NVarChar, req.user.uid)
      .query(`
        SELECT id, user_id, code, name, created_at
        FROM shelves
        WHERE user_id = @uid
        ORDER BY code ASC
      `);

    return res.json(result.recordset);
  } catch (err) {
    console.error("SHELVES_GET_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/", async (req, res) => {
  const code = req.body?.code?.trim();
  const name = req.body?.name?.trim() || null;

  if (!code) {
    return res.status(400).json({ error: "code zorunlu" });
  }

  try {
    const pool = await getPool();

    // insert + return single row (extra SELECT yok)
    const result = await pool
      .request()
      .input("uid", sql.NVarChar, req.user.uid)
      .input("code", sql.NVarChar, code)
      .input("name", sql.NVarChar, name).query(`
        INSERT INTO shelves (user_id, code, name)
        OUTPUT INSERTED.*
        VALUES (@uid, @code, @name)
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    // SQL Server duplicate key
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({
        error: "Bu raf kodu zaten mevcut",
      });
    }

    console.error("SHELVES_CREATE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const name = req.body?.name?.trim() || null;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Geçersiz id" });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("uid", sql.NVarChar, req.user.uid)
      .input("name", sql.NVarChar, name).query(`
        UPDATE shelves
        SET name = @name
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Bulunamadı" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("SHELVES_UPDATE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Geçersiz id" });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("uid", sql.NVarChar, req.user.uid).query(`
        DELETE FROM shelves
        WHERE id = @id AND user_id = @uid
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Bulunamadı" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("SHELVES_DELETE_ERROR:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
