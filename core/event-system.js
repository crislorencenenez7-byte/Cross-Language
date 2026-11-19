export class EventSystem {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Event callback must be a function.");
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event);
    handlers.add(callback);

    return () => handlers.delete(callback);
  }

  once(event, callback) {
    let unsubscribe;

    unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      callback(...args);
    });

    return unsubscribe;
  }

  emit(event, ...args) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    for (const callback of [...handlers]) {
      callback(...args);
    }
  }

  clear(event) {
    if (event === undefined) {
      this.listeners.clear();
    } else {
      this.listeners.delete(event);
    }
  }
}
