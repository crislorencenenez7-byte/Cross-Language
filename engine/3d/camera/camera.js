export function identityMatrix() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

export function perspective(fov, aspect, near, far) {
  if (aspect <= 0 || near <= 0 || far <= near) {
    throw new Error("Invalid perspective projection parameters.");
  }

  const f = 1 / Math.tan(fov / 2);
  const range = 1 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * range, -1,
    0, 0, 2 * far * near * range, 0
  ]);
}

export function orthographic(left, right, bottom, top, near, far) {
  if (
    right === left ||
    top === bottom ||
    far === near
  ) {
    throw new Error("Invalid orthographic projection parameters.");
  }

  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, -2 / (far - near), 0,
    -(right + left) / (right - left),
    -(top + bottom) / (top - bottom),
    -(far + near) / (far - near),
    1
  ]);
}

export class Camera3D {
  constructor(options = {}) {
    this.position = options.position || [0, 0, 5];
    this.target = options.target || [0, 0, 0];
    this.up = options.up || [0, 1, 0];
    this.fov = options.fov || Math.PI / 3;
    this.near = options.near || 0.1;
    this.far = options.far || 1000;
    this.aspect = options.aspect || 1;
  }

  projectionMatrix() {
    return perspective(
      this.fov,
      this.aspect,
      this.near,
      this.far
    );
  }

  setAspect(width, height) {
    this.aspect = width / Math.max(height, 1);
  }
}
