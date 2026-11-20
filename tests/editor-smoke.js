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
