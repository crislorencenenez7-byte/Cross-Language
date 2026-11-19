export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${message}`);
  }

  return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    vertexSource
  );

  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentSource
  );

  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    throw new Error("Unable to create WebGL program.");
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${message}`);
  }

  return program;
}
