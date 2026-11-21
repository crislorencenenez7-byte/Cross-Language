import { compileX } from "../../languages/x/index.js";
import { compileXSharp } from "../../languages/xsharp/index.js";
import { compileXS, callXS } from "../../languages/xs/index.js";

const API = window.CROSS_API_BASE || "http://127.0.0.1:8300/api";
const params = new URLSearchParams(location.search);
const projectId = params.get("id");
if (!projectId || !/^\\d+$/.test(projectId)) {
  window.location.replace("./editor.html?from=workspace");
}
const $ = id => document.getElementById(id);
const allowed = new Set([".x", ".xsharp", ".xs", ".txt", ".json", ".md", ".css", ".html", ".js", ".svg", ".xml"]);
const state = { project: null, files: [], open: new Map(), active: "", dirty: new Set() };

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function setStatus(message) { $("workspace-status").textContent = message; }
function ext(path) { const at = path.lastIndexOf("."); return at < 0 ? "" : path.slice(at).toLowerCase(); }
function basename(path) { return path.split("/").pop(); }
function languageName(path) {
  return ({ ".x": "X", ".xsharp": "X#", ".xs": "XS", ".html": "HTML", ".css": "CSS", ".js": "JavaScript", ".json": "JSON", ".md": "Markdown", ".svg": "SVG", ".xml": "XML", ".txt": "TEXT" })[ext(path)] || "TEXT";
}
function escapeText(value) { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }

function renderTree() {
  const root = { name: "", folders: new Map(), files: [] };
  for (const item of state.files) {
    const parts = item.path.split("/");
    let node = root;
    parts.forEach((part, index) => {
      if (index === parts.length - 1 && item.type === "file") node.files.push({ name: part, path: item.path });
      else {
        if (!node.folders.has(part)) node.folders.set(part, { name: part, path: parts.slice(0, index + 1).join("/"), folders: new Map(), files: [] });
        node = node.folders.get(part);
      }
    });
  }
  const host = $("file-tree"); host.replaceChildren();
  function appendNode(node, parent) {
    const folders = [...node.folders.values()].sort((a,b) => a.name.localeCompare(b.name));
    const files = [...node.files].sort((a,b) => a.name.localeCompare(b.name));
    for (const folder of folders) {
      const wrap = document.createElement("div");
      const button = document.createElement("button"); button.className = "tree-item folder"; button.type = "button";
      button.innerHTML = `<span class="tree-icon">📁</span><span class="tree-name">${escapeText(folder.name)}</span>`;
      const children = document.createElement("div"); children.className = "tree-children";
      button.addEventListener("click", () => { const hidden = children.hidden; children.hidden = !hidden; button.querySelector(".tree-icon").textContent = hidden ? "📂" : "📁"; });
      wrap.append(button, children); parent.append(wrap); appendNode(folder, children);
    }
    for (const file of files) {
      const button = document.createElement("button"); button.type = "button";
      button.className = `tree-item ${state.active === file.path ? "active" : ""}`;
      const icon = ext(file.path) === ".x" ? "✦" : ext(file.path) === ".xsharp" ? "◈" : ext(file.path) === ".xs" ? "λ" : "📄";
      button.innerHTML = `<span class="tree-icon">${icon}</span><span class="tree-name">${escapeText(file.name)}</span>`;
      button.title = file.path; button.addEventListener("click", () => openFile(file.path)); parent.append(button);
    }
  }
  appendNode(root, host);
  $("file-count").textContent = `${state.files.filter(f => f.type === "file").length} files`;
  if (!state.files.length) host.innerHTML = '<p class="empty-state">No files yet. Use ＋ File to create one.</p>';
}
function renderTabs() {
  const host = $("editor-tabs"); host.replaceChildren();
  if (!state.open.size) { const empty = document.createElement("span"); empty.className = "empty-tab"; empty.textContent = "No file open"; host.append(empty); return; }
  for (const path of state.open.keys()) {
    const tab = document.createElement("button"); tab.type = "button";
    tab.className = `editor-tab ${path === state.active ? "active" : ""}`;
    tab.textContent = basename(path);
    if (state.dirty.has(path)) { const dot = document.createElement("span"); dot.className = "tab-dirty"; dot.textContent = "●"; tab.append(dot); }
    tab.title = path; tab.addEventListener("click", () => activateTab(path)); host.append(tab);
  }
}
function updateLines() {
  const count = Math.max(1, $("source").value.split("\n").length);
  $("line-numbers").textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
  updateCursor();
}
function updateCursor() {
  const value = $("source").value.slice(0, $("source").selectionStart);
  const lines = value.split("\n");
  $("cursor-status").textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
}
function activateTab(path) {
  state.active = path;
  $("source").value = state.open.get(path) ?? "";
  $("source").disabled = false;
  $("active-path").textContent = path;
  $("language-badge").textContent = languageName(path);
  document.querySelectorAll(".language-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.language === languageName(path)));
  $("dirty-indicator").textContent = state.dirty.has(path) ? " • Unsaved" : "";
  renderTabs(); renderTree(); updateLines();
}
async function openFile(path) {
  try {
    if (!state.open.has(path)) {
      const data = await api(`/projects/${encodeURIComponent(projectId)}/file?path=${encodeURIComponent(path)}`);
      state.open.set(path, data.content);
    }
    activateTab(path); setStatus(`Opened ${path}`);
  } catch (error) { setStatus(error.message); }
}
async function refreshTree() {
  const data = await api(`/projects/${encodeURIComponent(projectId)}/tree`);
  state.files = data.items || []; renderTree();
}
async function saveActive() {
  const path = state.active;
  if (!path) return;
  const content = $("source").value;
  await api(`/projects/${encodeURIComponent(projectId)}/file`, { method: "POST", body: JSON.stringify({ path, content }) });
  state.open.set(path, content); state.dirty.delete(path);
  $("dirty-indicator").textContent = ""; renderTabs();
  setStatus(`Saved ${path}`);
  try { const channel = new BroadcastChannel(`cross-project-${projectId}`); channel.postMessage({ type: "file-saved", path }); channel.close(); } catch (_) {}
}
async function createItem(type) {
  const promptText = type === "folder" ? "Folder path (example: src/pages):" : "File path (example: src/pages/home.x):";
  const path = prompt(promptText); if (!path) return;
  const clean = path.trim().replace(/\\/g, "/");
  if (!clean || clean.startsWith("/") || clean.split("/").some(part => !part || part === "." || part === "..")) { alert("Use a relative path inside this project."); return; }
  if (type === "file" && !allowed.has(ext(clean))) { alert(`Unsupported file type. Allowed: ${[...allowed].join(", ")}`); return; }
  try {
    await api(`/projects/${encodeURIComponent(projectId)}/items`, { method: "POST", body: JSON.stringify({ type, path: clean }) });
    await refreshTree(); setStatus(`${type === "folder" ? "Created folder" : "Created file"}: ${clean}`);
    if (type === "file") await openFile(clean);
  } catch (error) { alert(error.message); }
}
function compileActive() {
  const path = state.active; if (!path) return;
  const content = $("source").value;
  try {
    if (ext(path) === ".x") {
      const result = compileX(content);
      $("output").textContent = `X COMPILE SUCCESS\nFile: ${path}\nRoot components: ${result.tree.length}`;
    } else if (ext(path) === ".xsharp") {
      const result = compileXSharp(content);
      $("output").textContent = `X# COMPILE SUCCESS\nFile: ${path}\nDesign blocks: ${result.components.length}`;
    } else if (ext(path) === ".xs") {
      const program = compileXS(content);
      const fn = program.functions.find(item => item.name === "start") || program.functions[0];
      if (!fn) throw new Error("No function found in this XS file.");
      const result = callXS(program, fn.name);
      $("output").textContent = `XS COMPILE + RUN SUCCESS\nFile: ${path}\nFunction: ${result.function}\n\nOUTPUT\n${result.output.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join("\n") || "(no output)"}\n\nRETURN\n${JSON.stringify(result.result)}`;
    } else {
      $("output").textContent = `${languageName(path)} file selected. CROSS compiler supports .x, .xsharp, and .xs source files.`;
    }
    setStatus(`Compile successful: ${path}`);
  } catch (error) { $("output").textContent = `${languageName(path)} ERROR\n${error.message}`; setStatus(`Compile failed: ${path}`); }
}

$("source").addEventListener("input", () => {
  if (!state.active) return;
  state.open.set(state.active, $("source").value); state.dirty.add(state.active);
  $("dirty-indicator").textContent = " • Unsaved"; renderTabs(); updateLines();
});
$("source").addEventListener("scroll", () => { $("line-numbers").scrollTop = $("source").scrollTop; });
$("source").addEventListener("click", updateCursor); $("source").addEventListener("keyup", updateCursor);
$("source").addEventListener("keydown", event => {
  if (event.key === "Tab") { event.preventDefault(); const start = event.target.selectionStart, end = event.target.selectionEnd; event.target.setRangeText("  ", start, end, "end"); event.target.dispatchEvent(new Event("input")); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveActive().catch(error => setStatus(error.message)); }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); compileActive(); }
});
$("new-folder").addEventListener("click", () => createItem("folder"));
$("new-file").addEventListener("click", () => createItem("file"));
$("save-file").addEventListener("click", () => saveActive().catch(error => setStatus(error.message)));
$("compile-file").addEventListener("click", compileActive);
async function refreshPreview(popout = false) {
  if (state.dirty.size) await saveActive();
  const url = `./preview.html?id=${encodeURIComponent(projectId)}&v=${Date.now()}`;
  if (popout) { window.open(url, "_blank", "noopener"); return; }
  const frame = $("preview-frame");
  const empty = $("preview-empty");
  if (frame) {
    frame.src = url;
    if (empty) empty.style.display = "none";
    setStatus("Live preview refreshed from the current project files.");
  }
}
$("open-preview").addEventListener("click", () => refreshPreview().catch(error => setStatus(error.message)));
$("preview-popout").addEventListener("click", () => refreshPreview(true).catch(error => setStatus(error.message)));
$("refresh-tree")?.addEventListener("click", () => refreshTree().catch(error => setStatus(error.message)));
$("terminal-toggle")?.addEventListener("click", () => {
  const panel = document.querySelector(".terminal-panel");
  if (!panel) return;
  panel.classList.toggle("collapsed");
  panel.style.height = panel.classList.contains("collapsed") ? "40px" : "";
  panel.style.flexBasis = panel.classList.contains("collapsed") ? "40px" : "";
});
document.querySelectorAll(".ide-menus [data-menu]").forEach(button => button.addEventListener("click", () => {
  const menu = button.dataset.menu;
  if (menu === "File") createItem("file");
  else if (menu === "Run") refreshPreview().catch(error => setStatus(error.message));
  else if (menu === "Terminal") document.querySelector(".terminal-panel")?.scrollIntoView({ block: "end" });
  else setStatus(`${menu} menu is ready for the next IDE tools update.`);
}));
$("clear-output").addEventListener("click", () => { $("output").textContent = ""; });
const languageEntry = { "X": "src/main.x", "X#": "src/main.xsharp", "XS": "src/main.xs" };
document.querySelectorAll(".language-tab").forEach(tab => tab.addEventListener("click", () => {
  const path = languageEntry[tab.dataset.language];
  if (state.files.some(file => file.type === "file" && file.path === path)) openFile(path);
  else setStatus(`No ${tab.dataset.language} entry file found. Create ${path} in the Explorer.`);
}));

async function checkDatabase() {
  const label = $("database-status");
  const dot = $("database-dot");
  try {
    const response = await fetch(`${API}/health`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data.database !== true) throw new Error("Database unavailable");
    label.textContent = "Connected · SQLite";
    dot.style.background = "#37c98a";
    dot.style.boxShadow = "0 0 9px #37c98a88";
  } catch (_) {
    label.textContent = "Connection unavailable";
    dot.style.background = "#e0a34a";
    dot.style.boxShadow = "0 0 9px #e0a34a88";
  }
}

async function start() {
  if (!projectId || !/^\d+$/.test(projectId)) throw new Error("Missing or invalid project ID in the URL.");
  const data = await api(`/projects/${encodeURIComponent(projectId)}`);
  state.project = data.project; checkDatabase(); $("project-name").textContent = state.project.name; $("explorer-project").textContent = state.project.name.toUpperCase();
  await refreshTree();
  const frame = $("preview-frame");
  if (frame) frame.src = `./preview.html?id=${encodeURIComponent(projectId)}`;
  const emptyPreview = $("preview-empty");
  if (emptyPreview) emptyPreview.style.display = "none";
  const preferred = ["src/main.x", "src/main.xsharp", "src/main.xs"].find(path => state.files.some(file => file.path === path && file.type === "file"));
  const first = state.files.find(file => file.type === "file");
  if (preferred || first) await openFile(preferred || first.path);
  else setStatus("Workspace ready. Create your first file.");
}
start().catch(error => { setStatus(error.message); $("file-tree").innerHTML = `<p class="empty-state">${escapeText(error.message)}</p>`; });

// Mobile navigation: Explorer is a slide-out panel; Preview replaces the editor on narrow screens.
const mobileExplorerToggle = $("mobile-explorer-toggle");
const mobilePreviewToggle = $("mobile-preview-toggle");
mobileExplorerToggle?.addEventListener("click", () => {
  $("explorer-panel")?.classList.toggle("mobile-open");
});
mobilePreviewToggle?.addEventListener("click", () => {
  const workbench = document.querySelector(".main-workbench");
  const showing = workbench?.classList.toggle("show-preview");
  mobilePreviewToggle.textContent = showing ? "Editor" : "Preview";
  if (showing) refreshPreview().catch(error => setStatus(error.message));
});
document.addEventListener("click", event => {
  const explorer = $("explorer-panel");
  if (!explorer || !explorer.classList.contains("mobile-open")) return;
  if (event.target.closest("#explorer-panel") || event.target.closest("#mobile-explorer-toggle")) return;
  explorer.classList.remove("mobile-open");
});
