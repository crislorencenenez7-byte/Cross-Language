import { compileX } from "../../../languages/x/index.js";
import { compileXSharp } from "../../../languages/xsharp/index.js";
import { compileXS, callXS } from "../../../languages/xs/index.js";

const language = document.getElementById("language");
const source = document.getElementById("source");
const output = document.getElementById("output");
const status = document.getElementById("status");

const samples = {
  X: `<app>
  <header>
    <title>My CROSS App</title>
  </header>
  <button id="play">Play Game</button>
</app>`,

  "X#": `device MainScreen {
  width: 100%
  layout: vertical
  padding: 20

  button PlayButton {
    color: blue
    width: 200
    radius: 10
  }
}`,

  XS: `function startGame() {
  print("Welcome to CROSS 3.0!")
  return 1
}`
};

function showResult(value) {
  output.textContent = JSON.stringify(value, null, 2);
}

function loadSample() {
  source.value = samples[language.value];
  status.textContent = `${language.value} sample loaded`;
  output.textContent = "Ready to compile.";
}

function runCode() {
  try {
    const code = source.value;
    let result;

    if (!code.trim()) {
      throw new Error("Editor is empty.");
    }

    switch (language.value) {
      case "X":
        result = compileX(code);
        break;

      case "X#":
        result = compileXSharp(code);
        break;

      case "XS": {
        const program = compileXS(code);
        const firstFunction = program.functions[0];

        result = {
          compiled: program,
          execution: callXS(program, firstFunction.name)
        };
        break;
      }

      default:
        throw new Error("Unknown language.");
    }

    showResult({
      success: true,
      language: language.value,
      result
    });

    status.textContent = `${language.value} compilation successful`;
  } catch (error) {
    output.textContent = `ERROR: ${error.message}`;
    status.textContent = "Compilation failed";
  }
}

language.addEventListener("change", loadSample);
document.getElementById("sample").addEventListener("click", loadSample);
document.getElementById("run").addEventListener("click", runCode);

loadSample();
