// Sandboxed WebGL Fragment Shader Engine for Custom AI & User Effects
// Uniform contract:
// uniform sampler2D u_image;
// uniform vec2 u_resolution;
// uniform float u_time;
// uniform float u_progress;
// uniform float u_intensity;

export interface ShaderCompilationResult {
  success: boolean;
  error?: string;
  render?: (
    sourceCanvas: HTMLCanvasElement | CanvasRenderingContext2D,
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    progress: number,
    intensity: number
  ) => void;
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = (a_position + 1.0) * 0.5;
  v_texCoord.y = 1.0 - v_texCoord.y; // flip Y for canvas alignment
}
`;

export function compileSandboxedShader(fragmentShaderCode: string): ShaderCompilationResult {
  if (typeof document === 'undefined') {
    return { success: false, error: 'WebGL not supported in SSR' };
  }

  // Create isolated offscreen canvas for shader rendering
  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 960;
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true });

  if (!gl) {
    return { success: false, error: 'WebGL context not supported by hardware' };
  }

  // Compile Vertex Shader
  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  if (!vertShader) return { success: false, error: 'Failed to create vertex shader' };
  gl.shaderSource(vertShader, VERTEX_SHADER_SRC);
  gl.compileShader(vertShader);

  // Compile Fragment Shader
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fragShader) return { success: false, error: 'Failed to create fragment shader' };

  // Ensure default precision header if not provided
  let fullFragSrc = fragmentShaderCode.trim();
  if (!fullFragSrc.includes('precision ')) {
    fullFragSrc = `precision mediump float;\n` + fullFragSrc;
  }

  gl.shaderSource(fragShader, fullFragSrc);
  gl.compileShader(fragShader);

  if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fragShader) || 'Fragment shader compilation error';
    return { success: false, error: info };
  }

  // Link Program
  const program = gl.createProgram();
  if (!program) return { success: false, error: 'Failed to create program' };
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'Program link error';
    return { success: false, error: info };
  }

  // Set up screen-aligned quad
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    gl.STATIC_DRAW
  );

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const uTimeLoc = gl.getUniformLocation(program, 'u_time');
  const uProgressLoc = gl.getUniformLocation(program, 'u_progress');
  const uIntensityLoc = gl.getUniformLocation(program, 'u_intensity');
  const uImageLoc = gl.getUniformLocation(program, 'u_image');
  const aPositionLoc = gl.getAttribLocation(program, 'a_position');

  return {
    success: true,
    render: (source, targetCtx, width, height, time, progress, intensity) => {
      try {
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }

        gl.useProgram(program);

        // Upload source frame to WebGL texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const sourceElement = 'canvas' in source ? source.canvas : source;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceElement);

        // Set uniforms
        if (uResolutionLoc) gl.uniform2f(uResolutionLoc, width, height);
        if (uTimeLoc) gl.uniform1f(uTimeLoc, time);
        if (uProgressLoc) gl.uniform1f(uProgressLoc, progress);
        if (uIntensityLoc) gl.uniform1f(uIntensityLoc, intensity);
        if (uImageLoc) gl.uniform1i(uImageLoc, 0);

        // Draw quad
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(aPositionLoc);
        gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Blit back to target 2D context
        targetCtx.drawImage(canvas, 0, 0, width, height);
      } catch (err) {
        console.warn('Shader execution fallback:', err);
      }
    }
  };
}

export class ShaderEngine {
  compile(code: string) {
    const res = compileSandboxedShader(code);
    if (!res.success) throw new Error(res.error || 'Shader compilation failed');
    return res;
  }
  dispose() {}
}
