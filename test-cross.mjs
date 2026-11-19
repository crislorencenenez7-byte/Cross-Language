import {compileX} from "./languages/x/index.js";
import {compileXSharp} from "./languages/xsharp/index.js";
import {compileXS,callXS} from "./languages/xs/index.js";
import {createCrossPlatform} from "./platform/cross-platform.js";

const x = compileX(`App Main {
 Page Home {
  Button Start {
   text: "Start"
  }
 }
}`);

const d = compileXSharp(`button Start {
 background: blue
 width: 200
}`);

const s = compileXS(`function startGame() {
 let score = 10
 let bonus = 5
 print(score + bonus)
 return score
}`);

const r = callXS(s,"startGame");

console.log("X:",x.valid);
console.log("X#:",d.valid);
console.log("XS:",r.output[0] === 15);

console.log("ALL TESTS FINISHED");
