const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Smart autofill: look up returning visitors by name / ID number.
router.get("/lookup", requireAuth, (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json([]);

  const like = `%${q}%`;
  const rows = db
    .prepare(
      `SELECT id, full_name, id_number
       FROM visitors
       WHERE full_name LIKE ? COLLATE NOCASE OR id_number LIKE ?
       ORDER BY updated_at DESC
       LIMIT 8`
    )
    .all(like, like);

  res.json(rows);
});

module.exports = router;
