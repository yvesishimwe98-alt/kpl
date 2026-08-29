# KPL Visitor Register

A digital replacement for the manuscript sign-in book at Kigali Public Library.
Staff at the front desk check visitors in and out from a browser instead of a
paper ledger — names, ID/passport number, phone, purpose of visit, and the
serial number of any library computer used, with arrival and departure times
recorded automatically.

## Why it's "smart", not just digital

- **Autofill for returning visitors** — typing a name, ID or phone number
  during check-in searches past visits and fills in the rest instantly.
- **Duplicate check-in prevention** — a visitor who is already checked in
  (by ID number) can't be checked in a second time, and a computer already
  assigned to someone can't be double-booked.
- **Live "who's in the library" dashboard** — auto-refreshes every 15s, with
  one-click check-out and a red "overdue" badge for anyone still checked in
  past a configurable number of hours (e.g. they may have left without
  signing out).
- **Searchable history + CSV export** — filter by name, ID, computer serial,
  date range or status, and export the filtered results for reporting or
  the library's records.
- **Usage insights** — busiest hours of the day, daily visit trends, and
  most-used computers, to help plan staffing and computer allocation.
- **Staff accounts** — each check-in/check-out is attributed to the staff
  member who recorded it; admins can add/remove accounts.

## Requirements

- Node.js 18+ (uses `better-sqlite3`, no external database server needed —
  data is stored in a single file at `data/library.db`)

## Setup

```bash
npm install
cp .env.example .env    # then edit .env if needed
npm start
```

Open `http://localhost:3000`. On first run, a default admin account is
created and printed to the console:

```
username: admin
password: changeme123
```

**Log in and change this password immediately** (Staff page → Change My
Password), and create named accounts for each staff member so check-ins are
attributed correctly.

## Configuration (`.env`)

| Variable         | Purpose                                                          |
|-------------------|-------------------------------------------------------------------|
| `PORT`            | Port the server listens on (default `3000`)                      |
| `SESSION_SECRET`  | Random string used to sign login sessions — set a long unique value in production |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Default admin account created on first run only |
| `OVERDUE_HOURS`   | Hours after which a still-checked-in visitor is flagged overdue on the dashboard (default `6`) |

## Project layout

```
server.js            Express app entrypoint, sessions, static pages
src/db.js             SQLite schema (users, visitors, visits)
src/seed.js           Creates the default admin account on first run
src/sessionStore.js   Login sessions persisted in SQLite (survive restarts)
src/routes/           auth, visits (check-in/out, history, export), visitors (autofill), stats
public/               Login, check-in, dashboard, history, insights and staff pages (no build step)
```

## Deploying at the library

This is a single small Node process with a file-based database, so it runs
well on one front-desk PC or a low-spec server on the local network:

```bash
npm install --omit=dev
npm start
```

Back up `data/library.db` periodically (it's the entire visitor record).
For always-on use, run it under a process manager such as `pm2` or a systemd
service so it restarts automatically if the machine reboots.
