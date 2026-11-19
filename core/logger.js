const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class Logger {
  constructor(level = "info") {
    this.setLevel(level);
  }

  setLevel(level) {
    if (!(level in LEVELS)) {
      throw new Error("Invalid log level: " + level);
    }
    this.level = level;
  }

  log(level, ...args) {
    if (!(level in LEVELS)) return;
    if (LEVELS[level] < LEVELS[this.level]) return;

    const output = console[level] || console.log;
    output.call(console, "[CROSS]", ...args);
  }

  debug(...args) { this.log("debug", ...args); }
  info(...args) { this.log("info", ...args); }
  warn(...args) { this.log("warn", ...args); }
  error(...args) { this.log("error", ...args); }
}
