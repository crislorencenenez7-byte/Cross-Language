// CROSS API endpoint selection.
// Local Termux preview uses the local SQLite backend; GitHub Pages uses Render.
(() => {
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  const isLocal = localHosts.has(window.location.hostname);
  window.CROSS_API_BASE = isLocal
    ? "http://127.0.0.1:8300/api"
    : "https://cross-studio-api.onrender.com/api";
})();
