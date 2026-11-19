import assert from "node:assert/strict";

import { compileX } from "../languages/x/index.js";
import { compileXSharp } from "../languages/xsharp/index.js";
import { compileXS, callXS } from "../languages/xs/index.js";

const web = compileX(`
<app>
  <header></header>
  <button id="play">Play</button>
</app>
`);

assert.equal(web.valid, true);
assert.equal(web.purpose, "Web Structure");
assert.equal(web.elements.length, 3);
console.log("PASS: X Web Structure");

const design = compileXSharp(`
device MainScreen {
  width: 100%
  layout: vertical

  button PlayButton {
    color: blue
    width: 200
  }
}
`);

assert.equal(design.valid, true);
assert.equal(design.components[0].name, "MainScreen");
assert.equal(design.components[0].children[0].name, "PlayButton");
console.log("PASS: X# Device Layout and Design");

const logic = compileXS(`
function startGame() {
  print("Game Started!")
  return 1
}
`);

const execution = callXS(logic, "startGame");

assert.deepEqual(execution.output, ["Game Started!"]);
assert.equal(execution.result, 1);
console.log("PASS: XS Functions and Logic");

console.log("ALL LANGUAGE TESTS PASSED");
