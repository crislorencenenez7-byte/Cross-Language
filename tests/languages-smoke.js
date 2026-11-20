import assert from "node:assert/strict";
import { compileX } from "../languages/x/index.js";
import { compileXSharp } from "../languages/xsharp/index.js";
import { compileXS, callXS } from "../languages/xs/index.js";

const web = compileX(`
App Main {
  Heading Title {
    text: "CROSS Test"
  }
  Button Play {
    text: "Play"
  }
}
`);
assert.equal(web.valid, true);
assert.equal(web.tree.length, 1);
assert.equal(web.tree[0].children.length, 2);
assert.ok(web.datatypes.includes("Object"));
console.log("PASS: X structure and datatype catalog");

const design = compileXSharp(`
device MainScreen {
  width: 100%
  layout: vertical
  padding: 20
  button Play {
    color: blue
    width: 200
  }
}
`);
assert.equal(design.valid, true);
assert.equal(design.components[0].name, "MainScreen");
assert.equal(design.components[0].children[0].name, "Play");
assert.ok(design.datatypes.includes("Responsive"));
console.log("PASS: X# layout and design types");

const logic = compileXS(`
function start() {
  let score: Integer = 10
  let bonus: Integer = 5
  let enabled: Boolean = true
  let values: Array = [1, 2, 3]
  let profile: Object = {name: "CROSS", level: 3}
  let launchDate: Date = Date("2026-11-20")
  let tags: Set = Set(["x", "xs"])
  let points: Map = Map([["level", 3]])
  let counter: Integer = 0
  while counter < 3 {
    set counter = counter + 1
  }
  if enabled {
    print(score + bonus)
  } else {
    print(0)
  }
  repeat 2 {
    print("RUN")
  }
  return score + bonus
}
`);
const execution = callXS(logic, "start");
assert.deepEqual(execution.output, [15, "RUN", "RUN"]);
assert.equal(execution.result, 15);
assert.deepEqual(execution.variables.values, [1, 2, 3]);
assert.equal(execution.variables.profile.name, "CROSS");
assert.ok(execution.variables.launchDate instanceof Date);
assert.ok(execution.variables.tags instanceof Set);
assert.ok(execution.variables.points instanceof Map);
assert.equal(execution.variables.counter, 3);
console.log("PASS: XS typed variables, arrays, objects, conditions and loops");

console.log("ALL LANGUAGE TESTS PASSED");
