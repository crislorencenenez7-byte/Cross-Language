import { EventSystem } from "./event-system.js";
import { Logger } from "./logger.js";
import { ModuleLoader } from "./module-loader.js";
import { createSettings } from "./settings.js";

export class CrossEngine {
  constructor(options = {}) {
    this.settings = createSettings(options);
    this.logger = new Logger(this.settings.logLevel);
    this.events = new EventSystem();
    this.modules = new ModuleLoader(this.logger);

    this.state = "created";
    this.lastTime = 0;
    this.frameHandle = null;

    this.context = {
      engine: this,
      settings: this.settings,
      events: this.events,
      logger: this.logger,
      modules: this.modules
    };

    this.loop = this.loop.bind(this);
  }

  registerModule(name, module, requires = []) {
    if (this.state !== "created") {
      throw new Error("Modules must be registered before initialization.");
    }

    this.modules.register(name, module, requires);
  }

  async initialize() {
    if (this.state !== "created") {
      throw new Error("Engine has already been initialized.");
    }

    this.state = "initializing";

    try {
      await this.modules.initialize(this.context);
      this.state = "initialized";
      this.events.emit("engine:initialized");
      this.logger.info("CROSS Engine initialized.");
    } catch (error) {
      this.state = "error";
      this.logger.error("Engine initialization failed:", error);
      throw error;
    }
  }

  async start() {
    if (this.state !== "initialized" && this.state !== "stopped") {
      throw new Error("Initialize the engine before starting.");
    }

    if (typeof globalThis.requestAnimationFrame !== "function") {
      throw new Error("This engine loop requires browser animation-frame support.");
    }

    await this.modules.start(this.context);

    this.state = "running";
    this.lastTime = performance.now();
    this.events.emit("engine:started");
    this.frameHandle = requestAnimationFrame(this.loop);

    this.logger.info("CROSS Engine started.");
  }

  loop(timestamp) {
    if (this.state !== "running") return;

    const elapsed = (timestamp - this.lastTime) / 1000;
    const deltaTime = Math.min(
      Math.max(elapsed, 0),
      this.settings.maxDeltaTime
    );

    this.lastTime = timestamp;

    try {
      this.modules.update(this.context, deltaTime);
      this.events.emit("engine:update", deltaTime);
    } catch (error) {
      this.logger.error("Engine update failed:", error);
      this.stop();
      return;
    }

    this.frameHandle = requestAnimationFrame(this.loop);
  }

  stop() {
    if (this.state !== "running") return;

    this.state = "stopped";

    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }

    this.events.emit("engine:stopped");
    this.logger.info("CROSS Engine stopped.");
  }

  async dispose() {
    this.stop();
    await this.modules.dispose(this.context);
    this.events.clear();
    this.state = "disposed";
    this.logger.info("CROSS Engine disposed.");
  }

  getStatus() {
    return {
      name: this.settings.name,
      version: this.settings.version,
      state: this.state,
      modules: this.modules.listModules()
    };
  }
}

export function createEngine(options = {}) {
  return new CrossEngine(options);
}
