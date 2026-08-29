require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

function seedAdmin() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (count > 0) return false;

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')`
  ).run(username, hash, "Library Administrator");

  console.log(`Seeded default admin account -> username: "${username}", password: "${password}"`);
  console.log("Please log in and change this password / create named staff accounts.");
  return true;
}

if (require.main === module) {
  const created = seedAdmin();
  if (!created) console.log("Users already exist, skipping seed.");
  process.exit(0);
}

module.exports = { seedAdmin };
