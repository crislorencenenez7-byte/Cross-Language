import { createProgram } from "../../graphics/webgl/shader.js";
import { GPUBuffer } from "../../graphics/webgl/buffer.js";

const VERTEX_SHADER = `#version 300 es
in vec3 aPosition;
in vec3 aColor;
out vec3 vColor;

void main() {
  gl_Position = vec4(aPosition, 1.0);
  vColor = aColor;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.0);
}`;

export class Renderer3D {
  constructor(device) {
    if (!device?.initialized || !device.gl) {
      throw new Error("Renderer3D requires an initialized GraphicsDevice.");
    }

    this.device = device;
    this.gl = device.gl;
    this.program = createProgram(
      this.gl,
      VERTEX_SHADER,
      FRAGMENT_SHADER
    );

    this.positionLocation = this.gl.getAttribLocation(
      this.program,
      "aPosition"
    );

    this.colorLocation = this.gl.getAttribLocation(
      this.program,
      "aColor"
    );

    this.vertexData = new GPUBuffer(
      this.gl,
      new Float32Array([
        0, 0.7, 0, 1, 0, 0,
        -0.7, -0.6, 0, 0, 1, 0,
        0.7, -0.6, 0, 0, 0, 1
      ])
    );
  }

  render(scene = null) {
    const gl = this.gl;

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.08, 0.09, 0.13, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    this.vertexData.bind();

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(
      this.positionLocation,
      3,
      gl.FLOAT,
      false,
      stride,
      0
    );

    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribPointer(
      this.colorLocation,
      3,
      gl.FLOAT,
      false,
      stride,
      3 * Float32Array.BYTES_PER_ELEMENT
    );

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    return {
      rendered: true,
      sceneObjects: scene?.list().length || 0
    };
  }

  dispose() {
    this.vertexData.dispose();
    this.gl.deleteProgram(this.program);
  }
}
