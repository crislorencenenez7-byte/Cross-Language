export const DEFAULT_SETTINGS = Object.freeze({
  name: "CROSS Studio",
  version: "3.0.0",
  renderer: "webgl2",
  targetFPS: 60,
  maxDeltaTime: 0.1,
  logLevel: "info",
  autoStart: false
});

export function createSettings(overrides = {}) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...overrides
  };

  if (!Number.isFinite(settings.targetFPS) || settings.targetFPS <= 0) {
    throw new Error("targetFPS must be a positive number.");
  }

  if (
    !Number.isFinite(settings.maxDeltaTime) ||
    settings.maxDeltaTime <= 0
  ) {
    throw new Error("maxDeltaTime must be positive.");
  }

  return Object.freeze(settings);
}
