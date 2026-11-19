import assert from "node:assert/strict";

import {
  identityMatrix,
  perspective,
  orthographic,
  Camera3D
} from "../engine/3d/camera/camera.js";

import { Scene } from "../engine/3d/scene/scene.js";

const identity = identityMatrix();
assert.equal(identity.length, 16);
assert.equal(identity[0], 1);
assert.equal(identity[15], 1);
console.log("PASS: Identity Matrix");

const projection = perspective(Math.PI / 3, 16 / 9, 0.1, 100);
assert.equal(projection.length, 16);
assert.ok(Number.isFinite(projection[0]));
console.log("PASS: Perspective Projection");

const ortho = orthographic(-1, 1, -1, 1, 0.1, 100);
assert.equal(ortho.length, 16);
console.log("PASS: Orthographic Projection");

const camera = new Camera3D();
camera.setAspect(1920, 1080);
assert.ok(Math.abs(camera.aspect - 16 / 9) < 0.0001);
console.log("PASS: 3D Camera");

const scene = new Scene("Test Scene");
const id = scene.add({ name: "Cube" });

assert.equal(scene.list().length, 1);
assert.equal(scene.get(id).name, "Cube");
assert.equal(scene.remove(id), true);
assert.equal(scene.list().length, 0);
console.log("PASS: Scene Object Registry");

console.log("ALL GRAPHICS SMOKE TESTS PASSED");
console.log("NOTE: Actual WebGL2 rendering must be tested in a browser.");
