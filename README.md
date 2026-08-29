# KPL Visitor Register

A digital replacement for the manuscript sign-in book at Kigali Public Library.
Anyone at the front desk unlocks the app with a shared passcode, then checks
visitors in and out from a browser instead of a paper ledger — name, ID/passport
number, and the serial number of the visitor's own laptop (visitors bring
their own devices; the library doesn't provide computers) — with arrival and
departure times recorded automatically.

## Why it's "smart", not just digital

- **One shared passcode, no accounts to manage** — this app has a single
  purpose (KPL's visitor register), so there's no per-staff login. Whoever
  knows the passcode can use it.
- **A small homepage links everything** — Check In, Check Out, Who's In,
  History and Insights are all one click from `/`.
- **Autofill for returning visitors** — typing a name or ID during check-in
  searches past visits and fills in the rest instantly.
- **Duplicate check-in prevention** — a visitor who is already checked in
  (by ID number) can't be checked in a second time.
- **Dedicated check-out flow** — search by name, ID or PC serial number, then
  press one button to confirm the visitor is leaving.
- **Live "who's in the library" view** — auto-refreshes every 15s, with a red
  "overdue" badge for anyone still checked in past a configurable number of
  hours (they may have left without checking out).
- **Time first, date out of the way** — check-in/out screens show only the
  time; every record is still timestamped underneath, and History groups
  results under a date heading instead of repeating the date on every row.
- **Searchable history + CSV export** — filter by name, ID, PC serial, date
  range or status, and export the filtered results for reporting.
- **Usage insights** — busiest hours of the day and daily visit trends, to
  help plan staffing and opening hours.

## Requirements

- Node.js 18+ (uses `better-sqlite3`, no external database server needed —
  data is stored in a single file at `data/library.db`)

## Setup

```bash
npm install
cp .env.example .env    # then set ACCESS_PASSCODE (and SESSION_SECRET)
npm start
```

Open `http://localhost:3000`, enter the passcode you set in `.env`, and
you're on the homepage.

## Configuration (`.env`)

| Variable          | Purpose                                                          |
|--------------------|-------------------------------------------------------------------|
| `PORT`             | Port the server listens on (default `3000`)                      |
| `SESSION_SECRET`   | Random string used to sign sessions — set a long unique value in production |
| `ACCESS_PASSCODE`  | The shared front-desk passcode. Change this before deploying.    |
| `OVERDUE_HOURS`    | Hours after which a still-checked-in visitor is flagged overdue (default `6`) |

## Project layout

```
server.js            Express app entrypoint, sessions, static pages
src/db.js             SQLite schema (visitors, visits)
src/sessionStore.js   Sessions persisted in SQLite (survive restarts)
src/routes/           auth (passcode unlock/lock), visits (check-in/out, history, export), visitors (autofill), stats
home.html              Hub page linking every page
checkin.html           Name / ID / PC serial + autofill
checkout.html          Search + confirm check-out
dashboard.html         Live "who's in" view
history.html           Date-grouped search history + CSV export
stats.html             Busiest hours / daily trend charts
passcode.html          Passcode gate
css/, js/, img/        Stylesheet, shared scripts, logo (no build step)
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
