import { useEffect, useRef, useState } from "react";
import { QUAD_VS, compileProgram, fitCanvas, getGL, makeQuad, rafLoop, reducedMotion } from "@/lib/gl";

/**
 * NebulaBackground — fullscreen WebGL2 FBM domain-warped nebula.
 * violet #6D5AE0 / periwinkle #8B9CF9 over void #07071A, ~30s drift,
 * mouse parallax ≤12px, vignette + grain, DPR-aware, pauses on
 * document.hidden, honors prefers-reduced-motion. CSS radial-gradient
 * fallback when WebGL2 is unavailable.
 */

const NEBULA_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime;   // seconds
uniform vec2 uMouse;   // -0.5..0.5
out vec4 fragColor;

vec3 VOID   = vec3(0.0275, 0.0275, 0.1020); // #07071A
vec3 VIOLET = vec3(0.4275, 0.3529, 0.8784); // #6D5AE0
vec3 PERI   = vec3(0.5451, 0.6118, 0.9765); // #8B9CF9
vec3 EMBER  = vec3(1.0, 0.4196, 0.2902);    // #FF6B4A

float hash(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float amp = 0.55;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 5; i++){
    v += amp * noise(p);
    p = rot * p * 2.02 + vec2(11.3, 7.1);
    amp *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

  // mouse parallax, capped at 12 CSS px equivalent
  vec2 par = uMouse * (12.0 / uRes.y);
  p += par;

  // ~30s drift
  float t = uTime * 0.033;

  // domain warp: q then r
  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)),
                fbm(p * 1.6 + vec2(5.2, t * 0.8)));
  vec2 r = vec2(fbm(p * 1.6 + 3.0 * q + vec2(1.7, 9.2) + t * 0.6),
                fbm(p * 1.6 + 3.0 * q + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(p * 1.6 + 2.5 * r);

  // shimmer: ±10% luminance at ~0.2Hz (4.8s loop)
  float shimmer = 1.0 + 0.10 * sin(uTime * 1.309);

  float neb = smoothstep(0.28, 0.85, f) * shimmer;
  float wisps = smoothstep(0.45, 0.95, fbm(p * 3.2 - r * 1.5 + t)) * 0.5;

  vec3 col = VOID;
  col += VIOLET * neb * 0.34;
  col += PERI * wisps * neb * 0.30;
  // brighter core pockets — restrained: atmosphere, not screensaver
  col += PERI * pow(max(f - 0.55, 0.0), 2.0) * 0.35 * shimmer;

  // faint warm counterpoint — a low ember wisp on the lower-right horizon,
  // breathing with the shimmer; atmosphere, never a second focal point
  vec2 wp = (uv - vec2(0.80, 0.14)) * vec2(uRes.x / uRes.y, 1.0);
  float wisp = exp(-dot(wp, wp) * 3.4) * (0.55 + 0.45 * fbm(p * 2.1 + r * 0.8));
  col += EMBER * wisp * 0.045 * shimmer;

  // vignette
  float vig = smoothstep(1.35, 0.35, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 1.4));
  col *= mix(0.72, 1.0, vig);

  // grain (~2%)
  float g = hash(uv * uRes + fract(uTime) * 43.7);
  col += (g - 0.5) * 0.02;

  fragColor = vec4(col, 1.0);
}`;

export function NebulaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = getGL(canvas);
    if (!gl) { setFallback(true); return; }

    const prog = compileProgram(gl, QUAD_VS, NEBULA_FS);
    const buf = makeQuad(gl);
    if (!prog || !buf) { setFallback(true); return; }

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");

    const onMove = (e: PointerEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const reduced = reducedMotion();
    const t0 = performance.now();

    const draw = (nowMs: number) => {
      fitCanvas(canvas, 1.75);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // ease mouse toward target (≤12px parallax applied in shader)
      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.04;
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 12.0 : (nowMs - t0) / 1000);
      gl.uniform2f(uMouse, mouse.current.x, mouse.current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let stop: () => void;
    if (reduced) {
      draw(t0); // single static frame
      const onResize = () => draw(t0);
      window.addEventListener("resize", onResize);
      stop = () => window.removeEventListener("resize", onResize);
    } else {
      const onResize = () => draw(performance.now());
      window.addEventListener("resize", onResize);
      const stopLoop = rafLoop(draw);
      stop = () => { stopLoop(); window.removeEventListener("resize", onResize); };
    }

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      {/* CSS radial-gradient fallback (also paints under the canvas) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(120% 90% at 72% 12%, rgb(var(--violet-500) / .16), transparent 55%),
            radial-gradient(90% 80% at 18% 78%, rgb(var(--peri-400) / .12), transparent 55%),
            radial-gradient(60% 50% at 50% 110%, rgb(var(--violet-400) / .10), transparent 60%),
            rgb(var(--void-950))`,
        }}
      />
      {!fallback && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
