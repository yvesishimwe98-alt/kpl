const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  res.json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("kpl.sid");
    res.json({ ok: true });
  });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, username, full_name, role FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json(user);
});

router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Current password and a new password (min 6 chars) are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

// --- Admin: manage staff accounts ---

router.get("/users", requireAdmin, (req, res) => {
  const users = db
    .prepare("SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at")
    .all();
  res.json(users);
});

router.post("/users", requireAdmin, (req, res) => {
  const { username, password, full_name, role } = req.body || {};
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: "Username, password and full name are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) return res.status(409).json({ error: "Username already exists" });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`
    )
    .run(username.trim(), hash, full_name.trim(), role === "admin" ? "admin" : "staff");

  res.status(201).json({ id: info.lastInsertRowid, username, full_name, role: role || "staff" });
});

router.delete("/users/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.userId) {
    return res.status(400).json({ error: "You cannot delete your own account while logged in" });
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ ok: true });
});

module.exports = router;
