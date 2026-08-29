const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

function passcodeMatches(entered) {
  const correct = process.env.ACCESS_PASSCODE || "";
  const a = Buffer.from(String(entered));
  const b = Buffer.from(correct);
  // Constant-time comparison so response timing can't leak the passcode.
  // Buffers must be equal length for timingSafeEqual, so pad the shorter one.
  if (a.length !== b.length) {
    const padded = Buffer.alloc(b.length);
    a.copy(padded);
    return crypto.timingSafeEqual(padded, b) && a.length === b.length;
  }
  return crypto.timingSafeEqual(a, b);
}

router.post("/unlock", (req, res) => {
  const { passcode } = req.body || {};
  if (!passcode) return res.status(400).json({ error: "Passcode is required" });

  if (!process.env.ACCESS_PASSCODE) {
    return res.status(500).json({ error: "Server has no ACCESS_PASSCODE configured" });
  }

  if (!passcodeMatches(passcode)) {
    return res.status(401).json({ error: "Incorrect passcode" });
  }

  req.session.unlocked = true;
  res.json({ ok: true });
});

router.post("/lock", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("kpl.sid");
    res.json({ ok: true });
  });
});

router.get("/status", requireAuth, (req, res) => {
  res.json({ unlocked: true });
});

module.exports = router;
