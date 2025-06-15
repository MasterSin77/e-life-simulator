/**
 * GPUSimulation.tsx
 *
 * FINAL 2-PASS PIXEL VERSION:
 * ✅ Pass 1: Mutate DNA on low-res texture.
 * ✅ Pass 2: Upscale to canvas with NEAREST filter.
 * ✅ Zoom & pan transform the quad.
 * ✅ Safe minimum zoom guarantees no black borders.
 */

import React, { useRef, useEffect } from 'react';

interface Props {
  zoomRef: React.MutableRefObject<number>;
  cameraRef: React.MutableRefObject<{ x: number; y: number }>;
  minZoom: number;
  setFps: (fps: number) => void;
  setPups: (pups: number) => void;
}

const GPUSimulation: React.FC<Props> = ({
  zoomRef,
  cameraRef,
  minZoom,
  setFps,
  setPups
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl2')!;
    if (!gl) {
      alert('WebGL2 not supported.');
      return;
    }

    const simWidth = 512;
    const simHeight = 512;
    const viewWidth = 800;
    const viewHeight = 800;

    canvas.width = viewWidth;
    canvas.height = viewHeight;

    // ✅ Safe minimum zoom = fill canvas
    const safeMinZoom = Math.max(viewWidth / simWidth, viewHeight / simHeight);
    zoomRef.current = safeMinZoom;

    // === 1) DNA Shader ===
    const vsDNA = `#version 300 es
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0, 1);
    }`;

    const fsDNA = `#version 300 es
    precision highp float;
    uniform sampler2D u_texture;
    uniform float u_time;
    in vec2 v_uv;
    out vec4 outColor;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
    }
    void main() {
      vec4 prev = texture(u_texture, v_uv);
      float noise = rand(v_uv + u_time);
      float newVal = clamp(prev.r + (noise - 0.5) * 0.1, 0.0, 1.0);
      outColor = vec4(newVal, newVal * 0.6, newVal * 0.2, 1.0);
    }`;

    // === 2) Display Shader ===
    const vsDisplay = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    uniform vec2 u_offset;
    uniform float u_scale;
    void main() {
      vec2 scaled = (a_position + u_offset) * u_scale;
      gl_Position = vec4(scaled, 0, 1);
      v_texCoord = a_texCoord;
    }`;

    const fsDisplay = `#version 300 es
    precision highp float;
    uniform sampler2D u_texture;
    in vec2 v_texCoord;
    out vec4 outColor;
    void main() {
      outColor = texture(u_texture, v_texCoord);
    }`;

    const compileShader = (type: GLenum, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader)!);
      }
      return shader;
    };

    const programDNA = gl.createProgram()!;
    gl.attachShader(programDNA, compileShader(gl.VERTEX_SHADER, vsDNA));
    gl.attachShader(programDNA, compileShader(gl.FRAGMENT_SHADER, fsDNA));
    gl.linkProgram(programDNA);
    if (!gl.getProgramParameter(programDNA, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(programDNA)!);
    }

    const programDisplay = gl.createProgram()!;
    gl.attachShader(programDisplay, compileShader(gl.VERTEX_SHADER, vsDisplay));
    gl.attachShader(programDisplay, compileShader(gl.FRAGMENT_SHADER, fsDisplay));
    gl.linkProgram(programDisplay);
    if (!gl.getProgramParameter(programDisplay, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(programDisplay)!);
    }

    // === Fullscreen Quad ===
    const quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const texCoords = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoords);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1,
    ]), gl.STATIC_DRAW);

    // === Ping-Pong Textures ===
    const createTexture = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simWidth, simHeight, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return tex;
    };

    let texA = createTexture();
    let texB = createTexture();
    let fbA = gl.createFramebuffer()!;
    let fbB = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texB, 0);

    const initData = new Uint8Array(simWidth * simHeight * 4);
    for (let i = 0; i < initData.length; i++) {
      initData[i] = Math.random() * 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, simWidth, simHeight,
      gl.RGBA, gl.UNSIGNED_BYTE, initData);

    const uTexDNA = gl.getUniformLocation(programDNA, 'u_texture');
    const uTimeDNA = gl.getUniformLocation(programDNA, 'u_time');

    const uTexDisp = gl.getUniformLocation(programDisplay, 'u_texture');
    const uOffset = gl.getUniformLocation(programDisplay, 'u_offset');
    const uScale = gl.getUniformLocation(programDisplay, 'u_scale');

    let t = 0;
    let frameCount = 0;
    let lastTime = performance.now();
    const maxZoom = 20;

    const render = () => {
      t += 0.01;

      // Pass 1: DNA update
      gl.useProgram(programDNA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(uTexDNA, 0);
      gl.uniform1f(uTimeDNA, t);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const posDNA = gl.getAttribLocation(programDNA, 'a_position');
      gl.enableVertexAttribArray(posDNA);
      gl.vertexAttribPointer(posDNA, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Pass 2: Display
      gl.useProgram(programDisplay);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, viewWidth, viewHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.uniform1i(uTexDisp, 0);

      // === Clamp zoom here ===
      const usedZoom = Math.max(zoomRef.current, safeMinZoom);
      const scale = usedZoom * (simWidth / viewWidth);

      const offset = [
        -cameraRef.current.x / simWidth * 2,
        -cameraRef.current.y / simHeight * 2
      ];

      gl.uniform1f(uScale, scale);
      gl.uniform2f(uOffset, offset[0], offset[1]);

      const posDisp = gl.getAttribLocation(programDisplay, 'a_position');
      const texDisp = gl.getAttribLocation(programDisplay, 'a_texCoord');
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(posDisp);
      gl.vertexAttribPointer(posDisp, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texCoords);
      gl.enableVertexAttribArray(texDisp);
      gl.vertexAttribPointer(texDisp, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      [texA, texB] = [texB, texA];
      [fbA, fbB] = [fbB, fbA];

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        setPups(simWidth * simHeight);
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(render);
    };
    render();

    let isDragging = false;
    let lastX = 0, lastY = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 0.8;
      let newZoom = zoomRef.current * factor;
      if (newZoom < safeMinZoom) {
        newZoom = safeMinZoom;
        cameraRef.current.x = 0;
        cameraRef.current.y = 0;
      } else if (newZoom > maxZoom) {
        newZoom = maxZoom;
      }
      zoomRef.current = newZoom;
    };

    const down = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const move = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      cameraRef.current.x -= dx / zoomRef.current;
      cameraRef.current.y -= dy / zoomRef.current;

      const visibleWidth = viewWidth / zoomRef.current;
      const visibleHeight = viewHeight / zoomRef.current;
      cameraRef.current.x = Math.max(0, Math.min(simWidth - visibleWidth, cameraRef.current.x));
      cameraRef.current.y = Math.max(0, Math.min(simHeight - visibleHeight, cameraRef.current.y));

      lastX = e.clientX;
      lastY = e.clientY;
    };

    const up = () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);

  }, [zoomRef, cameraRef, minZoom, setFps, setPups]);

  return <canvas ref={canvasRef} style={{ display: 'block', cursor: 'grab' }} />;
};

export default GPUSimulation;
