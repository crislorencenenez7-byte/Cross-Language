const API = "http://127.0.0.1:8300/api";

const form = document.getElementById("create-project-form");
const list = document.getElementById("project-list");
const card = document.getElementById("create-project-card");
const status = document.getElementById("project-form-status");
const submit = document.getElementById("create-project-submit");

const showButton = document.getElementById("show-create-project");
const cancelButton = document.getElementById("cancel-create-project");
const refreshButton = document.getElementById("refresh-projects");
const saveButton = document.getElementById("save-project");

const language = document.getElementById("language");
const source = document.getElementById("source");
const editorStatus = document.getElementById("status");
const output = document.getElementById("output");

let activeProject = null;
let currentLanguage = language.value;
let saving = false;
let suppressLanguageChange = false;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function projectTypeLabel(type) {
  return ({
    web: "WEB PROJECT",
    "2d": "2D GAME",
    "3d": "3D PROJECT",
    blank: "BLANK PROJECT"
  })[type] || "PROJECT";
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }

  return data;
}

function renderProjects(projects) {
  if (!projects.length) {
    list.innerHTML = `
      <div class="project-empty">
        <div class="empty-icon">◇</div>
        <strong>No projects yet</strong>
        <span>Create your first CROSS project to get started.</span>
      </div>`;
    return;
  }

  list.innerHTML = projects.map(project => `
    <article class="project-card">
      <div class="project-card-top">
        <span class="project-type">${escapeHTML(projectTypeLabel(project.project_type))}</span>
        <span class="project-id">#${Number(project.id)}</span>
      </div>
      <h3>${escapeHTML(project.name)}</h3>
      <p>${escapeHTML(project.description || "No description provided.")}</p>
      <div class="project-card-bottom">
        <span>${escapeHTML(project.folder || "Project folder pending")}</span>
        <button class="action-button secondary open-project"
          data-project-id="${Number(project.id)}" type="button">Open</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll(".open-project").forEach(button => {
    button.addEventListener("click", () => openProject(button.dataset.projectId));
  });
}

async function loadProjects() {
  list.innerHTML = '<div class="project-empty">Loading projects...</div>';

  try {
    const data = await requestJSON(`${API}/projects`);
    renderProjects(data.projects || []);
  } catch (error) {
    list.innerHTML = `
      <div class="project-empty project-error">
        <strong>Project API unavailable</strong>
        <span>${escapeHTML(error.message)}</span>
        <span>Start the CROSS backend on port 8300.</span>
      </div>`;
  }
}

function cacheCurrentEditor() {
  if (activeProject) {
    activeProject.files[currentLanguage] = source.value;
  }
}

async function saveLanguage(project, lang) {
  const content = project.files[lang] ?? "";

  await requestJSON(
    `${API}/projects/${encodeURIComponent(project.id)}/files`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, content })
    }
  );
}

async function saveProject() {
  if (!activeProject) {
    editorStatus.textContent = "Open a project before saving.";
    return false;
  }

  if (saving) return false;

  cacheCurrentEditor();
  saving = true;
  saveButton.disabled = true;
  editorStatus.textContent = `Saving ${activeProject.name}...`;

  try {
    for (const lang of ["X", "X#", "XS"]) {
      await saveLanguage(activeProject, lang);
    }

    editorStatus.textContent = `Saved: ${activeProject.name}`;
    return true;
  } catch (error) {
    editorStatus.textContent = `Save failed: ${error.message}`;
    return false;
  } finally {
    saving = false;
    saveButton.disabled = false;
  }
}

async function openProject(id) {
  if (activeProject) {
    const saved = await saveProject();
    if (!saved) {
      editorStatus.textContent += " — Open cancelled to protect your changes.";
      return;
    }
  }

  try {
    const data = await requestJSON(`${API}/projects/${encodeURIComponent(id)}`);
    activeProject = data.project;
    activeProject.files ||= { X: "", "X#": "", XS: "" };

    currentLanguage = "X";
    language.value = "X";

    // Prevent the language switch handler from saving sample code
    // into the previously active project file.
    suppressLanguageChange = true;
    language.dispatchEvent(new Event("change"));
    suppressLanguageChange = false;

    source.value = activeProject.files.X || "";
    editorStatus.textContent = `Project opened: ${activeProject.name}`;

    output.textContent =
      `PROJECT: ${activeProject.name}\n` +
      `TYPE: ${projectTypeLabel(activeProject.project_type)}\n` +
      `FOLDER: ${activeProject.folder}\n\n` +
      "Entry files:\n" +
      "X  → src/main.x\n" +
      "X# → src/main.xsharp\n" +
      "XS → src/main.xs\n\n" +
      "Use Save Project to save all three language files.";

    document.getElementById("workspace").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    editorStatus.textContent = `Open failed: ${error.message}`;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    type: String(formData.get("type") || "blank")
  };

  submit.disabled = true;
  showStatus("Creating project...");

  try {
    const data = await requestJSON(`${API}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showStatus(data.message || "Project created.");
    form.reset();
    card.hidden = true;

    await loadProjects();
    await openProject(data.project.id);
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    submit.disabled = false;
  }
});

source.addEventListener("input", cacheCurrentEditor);

language.addEventListener("change", async () => {
  const nextLanguage = language.value;

  if (suppressLanguageChange) {
    currentLanguage = nextLanguage;
    return;
  }

  if (activeProject && nextLanguage !== currentLanguage) {
    cacheCurrentEditor();

    const previousLanguage = currentLanguage;
    try {
      await saveLanguage(activeProject, previousLanguage);
      editorStatus.textContent = `Saved ${previousLanguage}; switched language.`;
    } catch (error) {
      editorStatus.textContent = `Auto-save failed: ${error.message}`;
    }

    currentLanguage = nextLanguage;
    source.value = activeProject.files[nextLanguage] || "";
  } else {
    currentLanguage = nextLanguage;
  }
});

saveButton.addEventListener("click", saveProject);

showButton.addEventListener("click", () => {
  card.hidden = false;
  document.getElementById("project-name").focus();
});

cancelButton.addEventListener("click", () => {
  card.hidden = true;
});

refreshButton.addEventListener("click", loadProjects);

loadProjects();
