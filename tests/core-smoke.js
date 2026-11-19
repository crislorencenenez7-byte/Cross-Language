import assert from "node:assert/strict";

import { EventSystem } from "../core/event-system.js";
import { Logger } from "../core/logger.js";
import { ModuleLoader } from "../core/module-loader.js";
import { createSettings } from "../core/settings.js";
import { createEngine } from "../core/engine.js";

const events = new EventSystem();
let received = 0;

events.on("test", value => {
  received = value;
});
events.emit("test", 123);

assert.equal(received, 123);

const settings = createSettings();
assert.equal(settings.version, "3.0.0");

const logger = new Logger("error");
const loader = new ModuleLoader(logger);
const sequence = [];

loader.register("graphics", {
  init() { sequence.push("graphics"); }
});

loader.register("renderer", {
  init() { sequence.push("renderer"); }
}, ["graphics"]);

await loader.initialize({});

assert.deepEqual(sequence, ["graphics", "renderer"]);

const engine = createEngine();
assert.equal(engine.getStatus().state, "created");
assert.deepEqual(engine.getStatus().modules, []);

console.log("PASS: Event System");
console.log("PASS: Engine Settings");
console.log("PASS: Module Dependencies");
console.log("PASS: Central Engine");
console.log("ALL CORE TESTS PASSED");
