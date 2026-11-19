export class GraphicsDevice {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.gl = null;
    this.capabilities = {};
    this.initialized = false;

    this.onContextLost = event => {
      event.preventDefault();
      this.initialized = false;
    };

    this.onContextRestored = () => {
      this.initialize();
    };
  }

  initialize() {
    if (!this.canvas) {
      throw new Error("GraphicsDevice requires a canvas.");
    }

    const gl = this.canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      depth: true,
      ...this.options
    });

    if (!gl) {
      throw new Error("WebGL2 is not supported by this browser.");
    }

    this.gl = gl;
    this.capabilities = {
      version: gl.getParameter(gl.VERSION),
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    };

    this.canvas.addEventListener(
      "webglcontextlost",
      this.onContextLost
    );

    this.canvas.addEventListener(
      "webglcontextrestored",
      this.onContextRestored
    );

    this.initialized = true;
    return this;
  }

  resize(width, height) {
    if (!this.gl) return;

    const dpr = globalThis.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));

    this.gl.viewport(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  dispose() {
    if (this.canvas) {
      this.canvas.removeEventListener(
        "webglcontextlost",
        this.onContextLost
      );

      this.canvas.removeEventListener(
        "webglcontextrestored",
        this.onContextRestored
      );
    }

    this.gl = null;
    this.initialized = false;
  }
}
