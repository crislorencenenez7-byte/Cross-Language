import assert from "node:assert/strict";
import { createCrossPlatform } from "../platform/cross-platform.js";

const cross = createCrossPlatform();

assert.equal(cross.name, "CROSS");
assert.equal(cross.version, "3.0");
assert.deepEqual(cross.getLanguages(), ["X", "X#", "XS"]);

const result = cross.compileProject({
  structure: "<app><button>Play</button></app>",
  design: `
device MainScreen {
  layout: vertical
}
`,
  logic: `
function start() {
  print("Ready")
}
`
});

assert.equal(result.success, true);
assert.equal(result.brand, "CROSS");
assert.ok(result.modules.structure);
assert.ok(result.modules.design);
assert.ok(result.modules.logic);

console.log("PASS: CROSS Brand");
console.log("PASS: Three Language Integration");
console.log("PASS: Unified Project Pipeline");
console.log("ALL PLATFORM TESTS PASSED");
