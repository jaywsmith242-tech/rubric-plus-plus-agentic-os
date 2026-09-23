import { useEffect, useRef, useState } from "react";
import { QUAD_VS, compileProgram, fitCanvas, getGL, makeQuad, reducedMotion } from "@/lib/gl";
import { registerDraw } from "@/lib/loop";
import { fnv1a } from "@/lib/rng";

/**
 * Orb — the one agent visual. Single hand-rolled WebGL2 fragment shader,
 * instanced per canvas (shared source/program pattern, ≤10 instances).
 *
 * Recipe (brief §5): dark glass rim → FBM domain-warped swirl in violet
 * #6D5AE0 + periwinkle #8B9CF9 → core bloom #EAF9F3 (brightest pixel in
 * the product) → fresnel rim light peri-400 → faint atmosphere halo.
 *
 * State machine — velocity = meaning; 480ms crossfade between states,
 * implemented by tweening the numeric uniform block (never hard-cut):
 *   idle:     swirl 3°/s, breathe ±6% luminance @ 2.8s
 *   thinking: swirl 6.6°/s + 4% vortex contraction pulse @ 1.4s
 *   acting:   directional streak bias + ember rim at 15% blend
 *   error:    desaturate 70%, 0.3× speed — never red-flash
 *   offline:  near-dark glass, faint rim only
 */

export type OrbState = "idle" | "thinking" | "acting" | "error" | "offline";

interface OrbParams {
  speed: number;   // swirl rotation, rad/s
  breathe: number; // luminance amplitude 0..1 (period handled in shader mix)
  vortex: number;  // vortex contraction strength 0..1
  streak: number;  // directional streak bias 0..1
  warm: number;    // ember rim blend 0..1
  desat: number;   // desaturation 0..1
  dark: number;    // darkness (offline) 0..1
}

const STATE_PARAMS: Record<OrbState, OrbParams> = {
  idle:     { speed: 0.0524, breathe: 0.06, vortex: 0.0, streak: 0.0, warm: 0.0,  desat: 0.0, dark: 0.0 },
  thinking: { speed: 0.1152, breathe: 0.04, vortex: 1.0, streak: 0.0, warm: 0.0,  desat: 0.0, dark: 0.0 },
  acting:   { speed: 0.1152, breathe: 0.05, vortex: 0.3, streak: 1.0, warm: 0.15, desat: 0.0, dark: 0.0 },
  error:    { speed: 0.0157, breathe: 0.02, vortex: 0.0, streak: 0.0, warm: 0.0,  desat: 0.7, dark: 0.1 },
  offline:  { speed: 0.0,    breathe: 0.0,  vortex: 0.0, streak: 0.0, warm: 0.0,  desat: 0.4, dark: 0.88 },
};

const ORB_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;    // seconds
uniform float uSeed;
uniform vec3  uA;       // swirl speed, breathe amp, vortex
uniform vec3  uB;       // streak, warm rim, desat
uniform float uDark;    // offline darkness
uniform vec2  uGaze;    // cursor gaze: swirl/core offset (≤6% of R)
uniform float uPulse;   // event pulse 0..1: +12% luminance, ember rim tint

vec3 VIOLET = vec3(0.4275, 0.3529, 0.8784); // #6D5AE0
vec3 PERI   = vec3(0.5451, 0.6118, 0.9765); // #8B9CF9
vec3 CORE   = vec3(0.9176, 0.9765, 0.9529); // #EAF9F3
vec3 EMBER  = vec3(1.0, 0.4196, 0.2902);    // #FF6B4A
vec3 VOID   = vec3(0.0275, 0.0275, 0.1020); // #07071A

float hash(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float amp = 0.55;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 4; i++){
    v += amp * noise(p);
    p = rot * p * 2.03 + vec2(9.2, 4.7);
    amp *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = vUv * 2.0 - 1.0;            // -1..1
  float R = 0.72;                        // silhouette radius
  float r = length(uv);
  // gaze: internal energy leans toward the cursor; geometry stays put
  vec2 guv = uv - uGaze * (0.06 * R);
  float ang = atan(guv.y, guv.x);

  float speed   = uA.x;
  float breathe = uA.y;
  float vortex  = uA.z;
  float streak  = uB.x;
  float warm    = uB.y;
  float desat   = uB.z;

  // --- internal swirl: polar FBM, domain-warped, rotating ---
  float rot = uTime * speed + uSeed;
  float ca = cos(rot), sa = sin(rot);
  vec2 pr = mat2(ca, -sa, sa, ca) * guv;

  // vortex contraction pulse: 4% @ 1.4s when thinking
  float pulse = 1.0 - vortex * 0.04 * (0.5 + 0.5 * sin(uTime * 4.4879));
  float rr = length(guv) * pulse;

  // log-spiral coordinate for swirl texture
  float spiral = ang + log(rr + 0.06) * (2.0 + 1.4 * vortex);
  vec2 sp = vec2(cos(spiral), sin(spiral)) * rr * 2.4;
  vec2 warp = vec2(fbm(sp * 2.0 + uSeed), fbm(sp * 2.0 - uSeed * 0.7));
  float swirl = fbm(sp * 2.2 + warp * 1.8 + vec2(uTime * speed * 2.0, 0.0));

  // directional streak bias (acting)
  float band = smoothstep(0.9, 0.1, abs(uv.y - 0.25 * sin(uTime * 1.2)));
  swirl += streak * band * 0.35 * fbm(vec2(uv.x * 3.0 - uTime * 1.8, uv.y * 6.0));

  // fake sphere normal + fresnel
  float rn = clamp(r / R, 0.0, 1.0);
  float z = sqrt(max(1.0 - rn * rn, 0.0));
  float fres = pow(1.0 - z, 2.2);

  // breathe: ±6% luminance @ 2.8s (sinusoidal)
  float lum = 1.0 + breathe * sin(uTime * 2.2440);

  // --- compose interior ---
  float body = smoothstep(0.15, 0.85, swirl);
  vec3 interior = mix(VIOLET * 0.55, PERI, body) * (0.35 + 0.85 * swirl);
  interior *= 0.45 + 0.55 * z;                    // limb darkening
  // core bloom — brightest pixel in the product
  float coreGlow = exp(-rr * rr * 14.0) * (0.9 + 0.4 * breathe * 8.0 * (0.5 + 0.5 * sin(uTime * 2.2440)));
  interior += CORE * coreGlow * (1.0 - uDark * 0.9);
  // fresnel rim light (peri; ember at 15% blend when acting, tinted on pulse)
  vec3 rimCol = mix(PERI, EMBER, max(warm, uPulse * 0.6));
  interior += rimCol * fres * (0.85 - uDark * 0.55);

  // desaturate (error) — 70% toward luma, never red-flash
  float luma = dot(interior, vec3(0.299, 0.587, 0.114));
  interior = mix(interior, vec3(luma), desat);
  interior *= lum * (1.0 - uDark * 0.85) * (1.0 + 0.12 * uPulse);

  // --- silhouette: dark glass rim so the orb sits on any panel ---
  float edge = smoothstep(R, R - 0.035, r);
  float glass = smoothstep(R, R - 0.12, r);
  vec3 col = mix(VOID * 0.6 + rimCol * fres * 0.35, interior, glass);
  col = mix(col, VOID * 0.35, (1.0 - glass) * 0.55); // near-black rim band
  col *= edge;

  // --- atmosphere halo outside silhouette ---
  float halo = exp(-max(r - R, 0.0) * 5.5) * (1.0 - edge);
  vec3 haloCol = mix(PERI, EMBER, warm * 0.5) * halo * 0.16 * lum * (1.0 - uDark * 0.85);

  float alpha = clamp(edge + halo * 0.5, 0.0, 1.0);
  fragColor = vec4(col + haloCol, alpha);
}`;

/** Mutable FX channel for the soul layer: gaze target (normalized -1..1)
 *  and the timestamp of the last event pulse. Owned by the parent, read and
 *  eased by the Orb every frame — no React re-renders. */
export interface OrbFx {
  gaze: { x: number; y: number };
  pulseAt: number; // performance.now() of the last event; -Infinity when none
}

export interface OrbProps {
  state?: OrbState;
  size?: number; // px, 32–240
  seedKey?: string; // stable per-agent seed
  className?: string;
  title?: string;
  fxRef?: React.MutableRefObject<OrbFx>;
}

export function Orb({ state = "idle", size = 64, seedKey = "orb", className = "", title, fxRef }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  // current + target param blocks, tweened over 480ms (state-change token)
  const params = useRef<{ cur: OrbParams; from: OrbParams; to: OrbParams; t0: number }>({
    cur: { ...STATE_PARAMS[state] },
    from: { ...STATE_PARAMS[state] },
    to: { ...STATE_PARAMS[state] },
    t0: 0,
  });
  const stateRef = useRef(state);

  useEffect(() => {
    if (stateRef.current === state) return;
    stateRef.current = state;
    const p = params.current;
    p.from = { ...p.cur };
    p.to = { ...STATE_PARAMS[state] };
    p.t0 = performance.now();
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = getGL(canvas);
    if (!gl) { setFallback(true); return; }
    const prog = compileProgram(gl, QUAD_VS, ORB_FS);
    const buf = makeQuad(gl);
    if (!prog || !buf) { setFallback(true); return; }

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uSeed = gl.getUniformLocation(prog, "uSeed");
    const uA = gl.getUniformLocation(prog, "uA");
    const uB = gl.getUniformLocation(prog, "uB");
    const uDark = gl.getUniformLocation(prog, "uDark");
    const uGaze = gl.getUniformLocation(prog, "uGaze");
    const uPulse = gl.getUniformLocation(prog, "uPulse");

    const seed = (fnv1a(seedKey) % 1000) / 1000 * 6.2831;
    const reduced = reducedMotion();
    const t0 = performance.now();
    const gazeCur = { x: 0, y: 0 };

    const draw = (nowMs: number) => {
      fitCanvas(canvas, 2);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      // 480ms crossfade between state param blocks (ease-state curve)
      const p = params.current;
      const k = Math.min(1, (nowMs - p.t0) / 480);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // cubic in-out ≈ (.65,0,.35,1)
      const L = (a: number, b: number) => a + (b - a) * e;
      p.cur = {
        speed: L(p.from.speed, p.to.speed),
        breathe: L(p.from.breathe, p.to.breathe),
        vortex: L(p.from.vortex, p.to.vortex),
        streak: L(p.from.streak, p.to.streak),
        warm: L(p.from.warm, p.to.warm),
        desat: L(p.from.desat, p.to.desat),
        dark: L(p.from.dark, p.to.dark),
      };
      // gaze eases toward the target; event pulse is one 600ms sinusoidal beat
      const fx = fxRef?.current;
      const gt = fx ? fx.gaze : { x: 0, y: 0 };
      gazeCur.x += (gt.x - gazeCur.x) * 0.07;
      gazeCur.y += (gt.y - gazeCur.y) * 0.07;
      const pk = fx ? (nowMs - fx.pulseAt) / 600 : 2;
      const pulse = pk >= 0 && pk < 1 ? Math.sin(Math.PI * pk) : 0;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 1.4 : (nowMs - t0) / 1000);
      gl.uniform1f(uSeed, seed);
      gl.uniform3f(uA, p.cur.speed, p.cur.breathe, p.cur.vortex);
      gl.uniform3f(uB, p.cur.streak, p.cur.warm, p.cur.desat);
      gl.uniform1f(uDark, p.cur.dark);
      gl.uniform2f(uGaze, gazeCur.x, gazeCur.y);
      gl.uniform1f(uPulse, pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let stop: () => void;
    if (reduced) {
      draw(t0);
      const id = window.setInterval(() => draw(performance.now()), 480); // state flips only
      stop = () => window.clearInterval(id);
    } else {
      stop = registerDraw(draw);
    }
    return () => {
      stop();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, [seedKey]);

  if (fallback) {
    return (
      <div
        className={`orb-css shrink-0 ${className}`}
        data-state={state}
        style={{ width: size, height: size }}
        title={title}
        role="img"
        aria-label={title ?? `orb ${state}`}
      />
    );
  }
  return (
    <canvas
      ref={canvasRef}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={title}
      role="img"
      aria-label={title ?? `orb ${state}`}
    />
  );
}
