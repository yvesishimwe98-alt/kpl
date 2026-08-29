require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const SqliteSessionStore = require("./src/sessionStore");

const { seedAdmin } = require("./src/seed");
const authRoutes = require("./src/routes/auth");
const visitRoutes = require("./src/routes/visits");
const visitorRoutes = require("./src/routes/visitors");
const statsRoutes = require("./src/routes/stats");

seedAdmin();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    store: new SqliteSessionStore(),
    name: "kpl.sid",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 12 * 60 * 60 * 1000, // 12 hours - a work shift
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/stats", statsRoutes);

// --- Static frontend ---
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// Pages that require a logged-in session; login.html itself stays public.
const protectedPages = ["checkin", "dashboard", "history", "stats", "staff"];
protectedPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    if (!req.session || !req.session.userId) return res.redirect("/login.html");
    res.sendFile(path.join(publicDir, `${page}.html`));
  });
});

app.get("/", (req, res) => {
  if (req.session && req.session.userId) return res.redirect("/dashboard");
  res.redirect("/login.html");
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Kigali Public Library visitor register running at http://localhost:${PORT}`);
});
