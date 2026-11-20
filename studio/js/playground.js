import { compileX, X_DATATYPES } from "../../languages/x/index.js";
import { compileXSharp, XSHARP_DATATYPES } from "../../languages/xsharp/index.js";
import { compileXS, callXS, XS_DATATYPES } from "../../languages/xs/index.js";
import { renderCROSS } from "./preview-renderer.js";

const samples = {
  X: `App Main {
  Heading HeroTitle {
    text: "Build with CROSS 3.0"
  }
  Paragraph Intro {
    text: "A small website created with X, styled with X# and powered by XS."
  }
  Button LaunchButton {
    text: "Run my project"
  }
  Card FeatureCard {
    text: "Structure · Design · Logic"
  }
}`,
  "X#": `device MainScreen {
  width: 100%
  layout: vertical
  padding: 20
  gap: 14
}
app Main {
  background: "#f5f8fc"
  color: "#17243a"
  padding: 22
  radius: 16
}
heading HeroTitle {
  color: "#1268c4"
  fontSize: 32
  fontWeight: 800
}
paragraph Intro {
  color: "#52647a"
  fontSize: 16
}
button LaunchButton {
  background: "#147bd1"
  color: white
  padding: 12
  radius: 10
}
card FeatureCard {
  background: "#e7f1fc"
  padding: 16
  radius: 12
}`,
  XS: `function start() {
  let project: String = "CROSS Studio"
  let score: Integer = 10
  let bonus: Integer = 5
  let active: Boolean = true
  let levels: Array = [1, 2, 3]
  let profile: Object = {name: "Cris", level: 3}

  if active {
    print(project)
    print(score + bonus)
  } else {
    print("Project inactive")
  }

  repeat 2 {
    print("XS runtime is running")
  }
  return score + bonus
}`
};

const source = document.getElementById("source");
const output = document.getElementById("output");
const status = document.getElementById("status");
const preview = document.getElementById("preview");
let language = "X";
const code = { ...samples };

function showStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status ${kind}`;
}

function setLanguage(next) {
  code[language] = source.value;
  language = next;
  source.value = code[language];
  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.language === language;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.getElementById("language-label").textContent = ({
    X: "X · Website Structure",
    "X#": "X# · Website Design",
    XS: "XS · Program Logic"
  })[language];
  updateLineCount();
  showStatus(`${language} editor ready.`);
}

function updateLineCount() {
  const count = source.value.split("\n").length;
  document.getElementById("line-count").textContent = `${count} line${count === 1 ? "" : "s"}`;
}

function renderPreview() {
  const structure = code.X.trim() || samples.X;
  const design = code["X#"].trim();
  const result = renderCROSS({ x: structure, xsharp: design }, preview);
  return result;
}

function runSelected() {
  code[language] = source.value;
  try {
    if (language === "X") {
      const result = compileX(source.value);
      renderPreview();
      output.textContent = `X COMPILE SUCCESS\nComponents: ${result.tree.length} root component(s)\nAvailable datatypes: ${result.datatypes.join(", ")}`;
      showStatus("X compiled and website preview updated.", "ok");
      return;
    }
    if (language === "X#") {
      const result = compileXSharp(source.value);
      renderPreview();
      output.textContent = `X# COMPILE SUCCESS\nDesign blocks: ${result.components.length}\nDesign datatypes: ${result.datatypes.join(", ")}`;
      showStatus("X# compiled and website styles applied.", "ok");
      return;
    }
    const program = compileXS(source.value);
    const selected = program.functions.find(fn => fn.name === "start") || program.functions[0];
    const result = callXS(program, selected.name);
    output.textContent =
      `XS COMPILE + RUN SUCCESS\nFunction: ${result.function}\n\nOUTPUT\n${result.output.map(value => typeof value === "object" ? JSON.stringify(value) : String(value)).join("\n") || "(no output)"}\n\nRETURN\n${JSON.stringify(result.result)}\n\nVARIABLES\n${JSON.stringify(result.variables, null, 2)}`;
    showStatus(`XS compiled and ran ${selected.name}().`, "ok");
  } catch (error) {
    output.textContent = `${language} ERROR\n${error.message}`;
    showStatus(`${language} compilation or runtime failed.`, "error");
  }
}

function loadSample() {
  source.value = samples[language];
  code[language] = source.value;
  updateLineCount();
  showStatus(`${language} sample loaded.`);
  if (language !== "XS") {
    try { renderPreview(); } catch (error) { /* sample remains editable */ }
  }
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => setLanguage(tab.dataset.language));
});
source.addEventListener("input", () => {
  code[language] = source.value;
  updateLineCount();
});
document.getElementById("run").addEventListener("click", runSelected);
document.getElementById("sample").addEventListener("click", loadSample);
document.getElementById("clear").addEventListener("click", () => {
  source.value = "";
  code[language] = "";
  updateLineCount();
  showStatus(`${language} editor cleared.`);
});
document.getElementById("datatype-list").innerHTML = [
  ["X · Structure", X_DATATYPES],
  ["X# · Design", XSHARP_DATATYPES],
  ["XS · Logic", XS_DATATYPES]
].map(([title, types]) => `<section class="datatype-group"><h4>${title}</h4><div class="chips">${types.map(type => `<span class="chip">${type}</span>`).join("")}</div></section>`).join("");

source.value = samples.X;
updateLineCount();
try { renderPreview(); } catch (error) { output.textContent = error.message; }
