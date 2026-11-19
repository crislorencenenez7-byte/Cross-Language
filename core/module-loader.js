export class ModuleLoader {
  constructor(logger) {
    this.logger = logger;
    this.modules = new Map();
    this.order = [];
    this.initialized = [];
    this.started = [];
  }

  register(name, module, requires = []) {
    if (!name || this.modules.has(name)) {
      throw new Error("Invalid or duplicate module: " + name);
    }

    if (!module || typeof module !== "object") {
      throw new TypeError("Module must be an object.");
    }

    this.modules.set(name, {
      name,
      module,
      requires: [...requires]
    });

    this.order = [];
  }

  resolveOrder() {
    const result = [];
    const visiting = new Set();
    const visited = new Set();

    const visit = name => {
      if (visited.has(name)) return;

      if (visiting.has(name)) {
        throw new Error("Circular module dependency: " + name);
      }

      const entry = this.modules.get(name);
      if (!entry) {
        throw new Error("Missing engine module: " + name);
      }

      visiting.add(name);

      for (const dependency of entry.requires) {
        visit(dependency);
      }

      visiting.delete(name);
      visited.add(name);
      result.push(entry);
    };

    for (const name of this.modules.keys()) {
      visit(name);
    }

    this.order = result;
    return result;
  }

  async initialize(context) {
    const order = this.resolveOrder();

    try {
      for (const entry of order) {
        if (entry.module.init) {
          await entry.module.init(context);
        }

        this.initialized.push(entry);
        this.logger?.info("Initialized module:", entry.name);
      }
    } catch (error) {
      await this.dispose(context);
      throw error;
    }
  }

  async start(context) {
    for (const entry of this.order) {
      if (entry.module.start) {
        await entry.module.start(context);
      }

      this.started.push(entry);
      this.logger?.info("Started module:", entry.name);
    }
  }

  update(context, deltaTime) {
    for (const entry of this.started) {
      entry.module.update?.(context, deltaTime);
    }
  }

  async stop(context) {
    for (const entry of [...this.started].reverse()) {
      try {
        await entry.module.stop?.(context);
      } catch (error) {
        this.logger?.error("Module stop failed:", entry.name, error);
      }
    }

    this.started = [];
  }

  async dispose(context) {
    await this.stop(context);

    for (const entry of [...this.initialized].reverse()) {
      try {
        await entry.module.dispose?.(context);
      } catch (error) {
        this.logger?.error("Module dispose failed:", entry.name, error);
      }
    }

    this.initialized = [];
  }

  getModule(name) {
    return this.modules.get(name)?.module || null;
  }

  listModules() {
    return [...this.modules.keys()];
  }
}
