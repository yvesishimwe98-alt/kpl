const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/summary", requireAuth, (req, res) => {
  const todayVisits = db
    .prepare(`SELECT COUNT(*) AS n FROM visits WHERE date(check_in_time) = date('now')`)
    .get().n;

  const currentlyIn = db.prepare(`SELECT COUNT(*) AS n FROM visits WHERE status = 'in'`).get().n;

  const avgDuration = db
    .prepare(
      `SELECT AVG((julianday(check_out_time) - julianday(check_in_time)) * 24 * 60) AS avg_minutes
       FROM visits WHERE status = 'out' AND date(check_in_time) = date('now')`
    )
    .get().avg_minutes;

  const totalVisitorsKnown = db.prepare(`SELECT COUNT(*) AS n FROM visitors`).get().n;

  const computersInUse = db
    .prepare(`SELECT COUNT(*) AS n FROM visits WHERE status = 'in' AND computer_serial IS NOT NULL AND computer_serial != ''`)
    .get().n;

  res.json({
    today_visits: todayVisits,
    currently_in: currentlyIn,
    avg_visit_minutes_today: avgDuration ? Math.round(avgDuration) : null,
    total_known_visitors: totalVisitorsKnown,
    computers_in_use: computersInUse,
  });
});

// Visits per hour of day (last 30 days) - helps staff see peak hours.
router.get("/hourly", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT CAST(strftime('%H', check_in_time) AS INTEGER) AS hour, COUNT(*) AS count
       FROM visits
       WHERE check_in_time >= datetime('now', '-30 days')
       GROUP BY hour
       ORDER BY hour`
    )
    .all();

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  rows.forEach((r) => {
    byHour[r.hour].count = r.count;
  });
  res.json(byHour);
});

// Visits per day (last 14 days) - simple trend.
router.get("/daily", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT date(check_in_time) AS day, COUNT(*) AS count
       FROM visits
       WHERE check_in_time >= datetime('now', '-14 days')
       GROUP BY day
       ORDER BY day`
    )
    .all();
  res.json(rows);
});

module.exports = router;
