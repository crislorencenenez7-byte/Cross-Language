import { compileX } from "../../../languages/x/index.js";
import { compileXSharp } from "../../../languages/xsharp/index.js";
import { compileXS, callXS } from "../../../languages/xs/index.js";

const language = document.getElementById("language");
const source = document.getElementById("source");
const output = document.getElementById("output");
const status = document.getElementById("status");

const samples = {
  X: `App Main {
  Heading Title {
    text: "My CROSS Website"
  }
  Paragraph Intro {
    text: "Built with X, X# and XS."
  }
  Button LaunchButton {
    text: "Launch"
  }
}`,
  "X#": `device MainScreen {
  width: 100%
  layout: vertical
  padding: 20
  gap: 14
}
app Main {
  background: "#f7f9fc"
  color: "#17243a"
  padding: 24
  radius: 16
}
heading Title {
  color: "#1268c4"
  fontSize: 32
  fontWeight: 800
}
button LaunchButton {
  background: "#147bd1"
  color: white
  padding: 12
  radius: 10
}`,
  XS: `function start() {
  let title: String = "Welcome to CROSS"
  let score: Integer = 10
  let bonus: Integer = 5
  let active: Boolean = true
  let values: Array = [10, 20, 30]

  if active {
    print(title)
    print(score + bonus)
  } else {
    print("Inactive")
  }

  repeat 2 {
    print("Running XS")
  }
  return score + bonus
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
