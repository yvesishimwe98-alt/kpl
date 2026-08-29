async function renderNav(pageTitle) {
  const host = document.getElementById("nav-host");
  if (!host) return;

  try {
    await Api.get("/auth/status");
  } catch (e) {
    return; // api.js already redirects to the passcode page on 401
  }

  host.innerHTML = `
    <nav class="topnav">
      <a href="/" class="brand"><img src="img/kpl-logo.jpg" alt="" class="brand-logo" />KPL Visitor Register</a>
      <div class="nav-links">
        ${pageTitle ? `<span class="nav-page-title">${pageTitle}</span>` : ""}
      </div>
      <div class="nav-user">
        <a href="/" class="btn-ghost">🏠 Home</a>
        <button id="lock-btn" class="btn-ghost">Lock</button>
      </div>
    </nav>
  `;

  document.getElementById("lock-btn").addEventListener("click", async () => {
    await Api.post("/auth/lock");
    window.location.href = "/passcode.html";
  });

  return true;
}
