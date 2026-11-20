# CROSS Studio 3.0

CROSS Studio is a browser-based development workspace with three complementary languages:

- **X** — declarative website structure and components.
- **X#** — visual design properties and layout.
- **XS** — typed variables and restricted program logic.

## Quick start (Termux / Linux)

Requirements: Python 3.10+ and Node.js 18+ (Node is needed only for tests).

```bash
cd CROSS-3.0
chmod +x start-local.sh stop-local.sh
./start-local.sh
```

Open these pages in the device browser:

- Studio: `http://127.0.0.1:8301/studio/editor.html`
- Code Playground: `http://127.0.0.1:8301/studio/playground.html`

Stop the local servers:

```bash
./stop-local.sh
```

Local mode automatically uses the SQLite database in `database/cross.db`. GitHub Pages mode uses the configured Render API.

## Language examples

### X — structure

```x
App Main {
  Heading Title {
    text: "Hello CROSS"
  }
  Paragraph Intro {
    text: "A website built with X."
  }
  Button StartButton {
    text: "Start"
  }
}
```

### X# — design

```xsharp
device MainScreen {
  width: 100%
  layout: vertical
  padding: 20
  gap: 12
}
button StartButton {
  background: "#167bd1"
  color: white
  radius: 10
  padding: 12
}
```

### XS — logic

```xs
function start() {
  let score: Integer = 10
  let bonus: Integer = 5
  let enabled: Boolean = true
  let scores: Array = [10, 20, 30]

  if enabled {
    print(score + bonus)
  } else {
    print(0)
  }

  repeat 2 {
    print("CROSS is running")
  }
  return score + bonus
}
```

## XS runtime

XS runs through the CROSS interpreter. It does **not** use JavaScript `eval` or execute arbitrary browser code.

Implemented statements:

- `let name = expression` and typed declarations such as `let score: Integer = 10`
- `set name = expression`
- `print(expression)`
- `return expression`
- `call functionName()`
- `if expression { ... } else { ... }`
- `while expression { ... }`
- `repeat expression { ... }`

Expressions support strings, numbers, booleans, null, arrays, objects, arithmetic, comparisons and logical operators. Runtime limits cap loop iterations, total interpreter steps and recursive call depth.

Datatype catalogues are descriptive language references. Runtime type validation is implemented for common primitive and collection types; advanced concepts such as Promise, Event, State, Reference and Iterator are catalogued but are not full asynchronous or browser APIs yet.

## Preview

The project preview compiles X structure and X# styles into DOM elements using safe DOM APIs. XS functions can be selected and run in the restricted interpreter. Raw HTML injection and arbitrary JS execution are not supported.

## Tests

Run from the project root:

```bash
node tests/languages-smoke.js
node tests/editor-smoke.js
node tests/platform-smoke.js
node tests/core-smoke.js
node tests/graphics-smoke.js
node test-cross.mjs
python -m compileall -q server
```

## Deployment notes

- `studio/js/api-config.js` selects the local API when opened on `localhost` or `127.0.0.1`; otherwise it uses the Render API.
- Render Free storage may be ephemeral. Keep local database backups.
- The current project API is a development backend. Do not store private information or expose write access publicly until authentication and ownership controls are added.

## CROSS Code Workspace and Live Preview

Open a project and choose **Open Code Workspace** to use the VS Code-inspired workspace. The Explorer lists folders and files from that project's own directory tree. Files are opened by their relative project path and saved back to that exact path through the workspace API. Nested paths such as `src/pages/home.x` are supported.

The workspace supports creating folders and files (`.x`, `.xsharp`, `.xs`, `.html`, `.css`, `.js`, `.json`, `.md`, `.svg`, `.xml`, and `.txt`). X, X#, and XS source files can be compiled from the editor. Use **Preview** to open the separate `studio/preview.html` page. The preview reads the project's file tree and source files from the backend, uses the configured project entry points when they contain source, and otherwise finds the first non-empty file for each CROSS language. It refreshes after saves and periodically while Auto refresh is enabled.

The editor currently uses a lightweight native text editor with line numbers, file tabs, indentation, keyboard shortcuts, and compile output. It does not yet provide full VS Code features such as language-server autocomplete, breakpoints, or extension support.
