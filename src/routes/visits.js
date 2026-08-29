const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/requireAuth");
const { toCsv } = require("../utils/csv");

const router = express.Router();
const OVERDUE_HOURS = Number(process.env.OVERDUE_HOURS || 6);

function findOrCreateVisitor({ full_name, id_number }) {
  if (!id_number) return null;

  const existing = db.prepare("SELECT * FROM visitors WHERE id_number = ?").get(id_number);
  if (existing) {
    db.prepare(
      `UPDATE visitors SET full_name = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(full_name, existing.id);
    return existing.id;
  }

  const info = db
    .prepare(`INSERT INTO visitors (full_name, id_number) VALUES (?, ?)`)
    .run(full_name, id_number);
  return info.lastInsertRowid;
}

function decorateActive(row) {
  const checkIn = new Date(row.check_in_time + "Z");
  const elapsedMs = Date.now() - checkIn.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  return {
    ...row,
    elapsed_minutes: elapsedMinutes,
    overdue: elapsedMinutes >= OVERDUE_HOURS * 60,
  };
}

// --- Check in ---
router.post("/checkin", requireAuth, (req, res) => {
  const full_name = (req.body?.full_name || "").trim();
  const id_number = (req.body?.id_number || "").trim() || null;
  const computer_serial = (req.body?.computer_serial || "").trim() || null;

  if (!full_name) return res.status(400).json({ error: "Full name is required" });

  if (id_number) {
    const alreadyIn = db
      .prepare("SELECT id FROM visits WHERE id_number = ? AND status = 'in'")
      .get(id_number);
    if (alreadyIn) {
      return res
        .status(409)
        .json({ error: `This visitor (ID ${id_number}) is already checked in and hasn't checked out yet.` });
    }
  }

  const visitor_id = findOrCreateVisitor({ full_name, id_number });

  const info = db
    .prepare(
      `INSERT INTO visits (visitor_id, full_name, id_number, computer_serial, status)
       VALUES (?, ?, ?, ?, 'in')`
    )
    .run(visitor_id, full_name, id_number, computer_serial);

  const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(decorateActive(visit));
});

// --- Check out ---
router.post("/:id/checkout", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const visit = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);
  if (!visit) return res.status(404).json({ error: "Visit not found" });
  if (visit.status !== "in") return res.status(400).json({ error: "This visit is already checked out" });

  db.prepare(
    `UPDATE visits SET status = 'out', check_out_time = datetime('now') WHERE id = ?`
  ).run(id);

  const updated = db.prepare("SELECT * FROM visits WHERE id = ?").get(id);
  res.json(updated);
});

// --- Currently in the library ---
router.get("/active", requireAuth, (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM visits WHERE status = 'in' ORDER BY check_in_time ASC`)
    .all();
  res.json(rows.map(decorateActive));
});

// --- History / search ---
function buildHistoryQuery(query) {
  const clauses = [];
  const params = [];

  if (query.from) {
    clauses.push("date(check_in_time) >= date(?)");
    params.push(query.from);
  }
  if (query.to) {
    clauses.push("date(check_in_time) <= date(?)");
    params.push(query.to);
  }
  if (query.status && (query.status === "in" || query.status === "out")) {
    clauses.push("status = ?");
    params.push(query.status);
  }
  if (query.q) {
    clauses.push("(full_name LIKE ? COLLATE NOCASE OR id_number LIKE ? OR computer_serial LIKE ?)");
    const like = `%${query.q}%`;
    params.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

router.get("/", requireAuth, (req, res) => {
  const { where, params } = buildHistoryQuery(req.query);
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`SELECT COUNT(*) AS n FROM visits ${where}`).get(...params).n;
  const rows = db
    .prepare(
      `SELECT * FROM visits ${where} ORDER BY check_in_time DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({ rows, total, page, pageSize });
});

// --- CSV export (filtered, unpaginated) ---
router.get("/export.csv", requireAuth, (req, res) => {
  const { where, params } = buildHistoryQuery(req.query);
  const rows = db
    .prepare(`SELECT * FROM visits ${where} ORDER BY check_in_time DESC`)
    .all(...params);

  const csv = toCsv(rows, [
    { key: "id", label: "ID" },
    { key: "full_name", label: "Full Name" },
    { key: "id_number", label: "ID/Passport Number" },
    { key: "computer_serial", label: "PC Serial Number" },
    { key: "check_in_time", label: "Check-in Time (UTC)" },
    { key: "check_out_time", label: "Check-out Time (UTC)" },
    { key: "status", label: "Status" },
  ]);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="kpl-visits-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = router;
