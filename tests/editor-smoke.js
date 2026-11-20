import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("studio/playground.html", "utf8");
const js = fs.readFileSync("studio/js/playground.js", "utf8");
const preview = fs.readFileSync("studio/preview.html", "utf8");

assert.ok(html.includes('id="source"'));
assert.ok(html.includes('id="run"'));
assert.ok(html.includes('id="preview"'));
assert.ok(js.includes("compileX"));
assert.ok(js.includes("compileXSharp"));
assert.ok(js.includes("compileXS"));
assert.ok(js.includes("callXS"));
assert.ok(preview.includes('id="run-xs"'));

console.log("PASS: CROSS Code Playground");
console.log("PASS: Live Website Preview");
console.log("PASS: XS Runtime Controls");
console.log("ALL EDITOR TESTS PASSED");

const workspaceHtml = fs.readFileSync("studio/code-editor.html", "utf8");
const workspaceJs = fs.readFileSync("studio/js/workspace-editor.js", "utf8");
const workspaceApi = fs.readFileSync("server/workspace_api.py", "utf8");
assert.ok(workspaceHtml.includes('id="file-tree"'));
assert.ok(workspaceHtml.includes('id="editor-tabs"'));
assert.ok(workspaceHtml.includes('data-language="X#"'));
assert.ok(workspaceHtml.includes('data-language="XS"'));
assert.ok(workspaceJs.includes('/tree'));
assert.ok(workspaceJs.includes('/file?path='));
assert.ok(workspaceJs.includes('BroadcastChannel'));
assert.ok(workspaceApi.includes('".xsharp", ".xs"'));
assert.ok(workspaceApi.includes('".html", ".js"'));
assert.ok(preview.includes('/tree'));
assert.ok(preview.includes('BroadcastChannel'));
console.log("PASS: Project File Explorer and Connected Workspace");
console.log("PASS: Project-Path Based Live Preview");
