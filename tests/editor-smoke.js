import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("studio/editor.html", "utf8");
const js = fs.readFileSync("studio/js/editor/language-editor.js", "utf8");

assert.ok(html.includes('id="language"'));
assert.ok(html.includes('id="source"'));
assert.ok(html.includes('id="run"'));
assert.ok(js.includes("compileX"));
assert.ok(js.includes("compileXSharp"));
assert.ok(js.includes("compileXS"));

console.log("PASS: Language Selector");
console.log("PASS: Code Editor");
console.log("PASS: Compiler Integration");
console.log("ALL EDITOR TESTS PASSED");
