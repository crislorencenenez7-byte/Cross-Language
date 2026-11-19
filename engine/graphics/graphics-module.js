import { GraphicsDevice } from "./webgl/device.js";
import { Renderer3D } from "../3d/renderer/renderer.js";

export class GraphicsModule {
  constructor(options = {}) {
    this.options = options;
    this.device = null;
    this.renderer = null;
  }

  async init(engine) {
    this.engine = engine;
  }

  async start() {
    if (!this.options.canvas) {
      return;
    }

    this.device = new GraphicsDevice(
      this.options.canvas,
      this.options.contextOptions
    ).initialize();

    this.renderer = new Renderer3D(this.device);
  }

  update() {
    if (this.renderer) {
      this.renderer.render();
    }
  }

  stop() {
    this.renderer?.dispose();
    this.device?.dispose();
    this.renderer = null;
    this.device = null;
  }

  dispose() {
    this.stop();
  }
}
