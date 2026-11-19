export class GPUBuffer {
  constructor(gl, data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
    this.gl = gl;
    this.target = target;
    this.buffer = gl.createBuffer();

    if (!this.buffer) {
      throw new Error("Unable to create GPU buffer.");
    }

    this.update(data, usage);
  }

  update(data, usage = this.gl.STATIC_DRAW) {
    this.gl.bindBuffer(this.target, this.buffer);
    this.gl.bufferData(this.target, data, usage);
    this.length = data.length;
  }

  bind() {
    this.gl.bindBuffer(this.target, this.buffer);
  }

  dispose() {
    if (this.buffer) {
      this.gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }
  }
}
