async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Not authenticated");
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (data && data.error) || "Something went wrong";
    throw new Error(message);
  }
  return data;
}

const Api = {
  get: (path) => api(path),
  post: (path, body) => api(path, { method: "POST", body }),
  del: (path) => api(path, { method: "DELETE" }),
};
