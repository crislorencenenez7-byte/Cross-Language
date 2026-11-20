import assert from "node:assert/strict";
import { createCrossPlatform } from "../platform/cross-platform.js";

const cross = createCrossPlatform();
assert.equal(cross.name, "CROSS");
assert.equal(cross.version, "3.0");
assert.deepEqual(cross.getLanguages(), ["X", "X#", "XS"]);

const result = cross.compileProject({
  structure: `App Main {
    Button Play {
      text: "Play"
    }
  }`,
  design: `device MainScreen {
    layout: vertical
  }`,
  logic: `function start() {
    let ready: Boolean = true
    if ready {
      print("Ready")
    }
  }`
});

assert.equal(result.success, true);
assert.equal(result.brand, "CROSS");
assert.ok(result.modules.structure);
assert.ok(result.modules.design);
assert.ok(result.modules.logic);
assert.ok(result.website.html.includes("<button"));

console.log("PASS: CROSS Brand");
console.log("PASS: Three Language Integration");
console.log("PASS: Unified Project Pipeline");
console.log("ALL PLATFORM TESTS PASSED");
