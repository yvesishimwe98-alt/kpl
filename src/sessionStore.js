const session = require("express-session");
const db = require("./db");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    expires INTEGER,
    data TEXT NOT NULL
  );
`);

// Drop anything that expired while the server was down.
db.prepare("DELETE FROM sessions WHERE expires IS NOT NULL AND expires < ?").run(Date.now());

class SqliteSessionStore extends session.Store {
  get(sid, cb) {
    try {
      const row = db.prepare("SELECT data, expires FROM sessions WHERE sid = ?").get(sid);
      if (!row) return cb(null, null);
      if (row.expires && row.expires < Date.now()) {
        db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sessionData, cb) {
    try {
      const expires = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;
      db.prepare(
        `INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data`
      ).run(sid, expires, JSON.stringify(sessionData));
      cb && cb();
    } catch (err) {
      cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      cb && cb();
    } catch (err) {
      cb && cb(err);
    }
  }

  touch(sid, sessionData, cb) {
    this.set(sid, sessionData, cb);
  }
}

module.exports = SqliteSessionStore;
