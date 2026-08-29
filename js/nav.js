async function renderNav(active) {
  const host = document.getElementById("nav-host");
  if (!host) return;

  let user = null;
  try {
    user = await Api.get("/auth/me");
  } catch (e) {
    return; // api.js already redirects to login on 401
  }

  const links = [
    { key: "checkin", href: "/checkin", label: "Check In / Out" },
    { key: "dashboard", href: "/dashboard", label: "In the Library" },
    { key: "history", href: "/history", label: "History" },
    { key: "stats", href: "/stats", label: "Insights" },
  ];
  if (user.role === "admin") links.push({ key: "staff", href: "/staff", label: "Staff" });

  host.innerHTML = `
    <nav class="topnav">
      <div class="brand"><img src="img/kpl-logo.jpg" alt="" class="brand-logo" />KPL Visitor Register</div>
      <div class="nav-links">
        ${links
          .map(
            (l) =>
              `<a href="${l.href}" class="${l.key === active ? "active" : ""}">${l.label}</a>`
          )
          .join("")}
      </div>
      <div class="nav-user">
        <span>${user.full_name}</span>
        <button id="logout-btn" class="btn-ghost">Log out</button>
      </div>
    </nav>
  `;

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await Api.post("/auth/logout");
    window.location.href = "/login.html";
  });

  return user;
}
