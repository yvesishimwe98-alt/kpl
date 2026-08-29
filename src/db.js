const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "library.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    id_number TEXT UNIQUE,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id INTEGER REFERENCES visitors(id),
    full_name TEXT NOT NULL,
    id_number TEXT,
    phone TEXT,
    purpose TEXT,
    computer_serial TEXT,
    check_in_time TEXT NOT NULL DEFAULT (datetime('now')),
    check_out_time TEXT,
    checked_in_by INTEGER REFERENCES users(id),
    checked_out_by INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'in'
  );

  CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
  CREATE INDEX IF NOT EXISTS idx_visits_checkin ON visits(check_in_time);
  CREATE INDEX IF NOT EXISTS idx_visits_id_number ON visits(id_number);
  CREATE INDEX IF NOT EXISTS idx_visitors_id_number ON visitors(id_number);
  CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(full_name);
`);

module.exports = db;
