import { useEffect, useRef } from "react";
import { agentsData } from "@/lib/data";
import { subscribeEvents } from "@/lib/live";
import { registerDraw } from "@/lib/loop";
import { reducedMotion } from "@/lib/gl";
import type { Agent } from "@/types/data";

/**
 * SwarmField — the living swarm. Six boids (one per agent) flocking in the
 * hero's sky: separation 1.0 / alignment 0.35 / cohesion 0.3, a soft
 * elliptical home-anchor spring per agent (Robo near the hero orb,
 * departments orbiting 80–220px), and gentle cursor repulsion (90px, 0.15).
 *
 * Rendering: glow-sprites in the status color family with a three-radius
 * bloom; light threads (peri, distance-scaled α ≤ .20) between agents within
 * 160px; when the ambient 45s event cycle names an actor, that sprite pulses
 * and an ember beat travels its threads for 600ms. Names fade in only near
 * the cursor. Shared rAF loop, DPR-aware, pauses when hidden.
 */

interface Boid {
  agent: Agent;
  x: number; y: number; vx: number; vy: number;
  homeR: number;      // orbit radius around the hero center
  homeA: number;      // base angle
  dir: 1 | -1;        // orbit direction
  labelA: number;     // label fade 0..1
  r: number;
}

const SEP_R = 55, ALI_R = 140, COH_R = 160, THREAD_R = 160;
const SEP_W = 1.0, ALI_W = 0.35, COH_W = 0.3;
const CURSOR_R = 90, CURSOR_W = 0.15;
const MAX_V = 34; // px/s

function spriteColor(a: Agent): { core: string; alpha: number } {
  switch (a.status) {
    case "active": return { core: "#8B9CF9", alpha: 0.95 };  // peri
    case "running": return { core: "#8B9CF9", alpha: 0.95 }; // peri core + ember rim
    case "idle": return { core: "#8B76F0", alpha: 0.8 };     // violet-400
    case "offline": return { core: "#6D5AE0", alpha: 0.14 }; // near-dark
  }
}

export function SwarmField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 800, H = 430;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.max(1, W * dpr);
      canvas.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const agents = agentsData.agents;
    const boids: Boid[] = agents.map((a, i) => {
      const isHero = a.id === "robo";
      const homeA = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
      const homeR = isHero ? 30 : 80 + ((i * 37) % 140); // 80–220px
      return {
        agent: a,
        x: W / 2 + Math.cos(homeA) * homeR,
        y: H / 2 + Math.sin(homeA) * homeR * 0.55,
        vx: 0, vy: 0,
        homeR, homeA,
        dir: i % 2 === 0 ? 1 : -1,
        labelA: 0,
        r: isHero ? 7 : 5,
      };
    });

    const cursor = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursor.x = e.clientX - rect.left;
      cursor.y = e.clientY - rect.top;
    };
    const onLeave = () => { cursor.x = -9999; cursor.y = -9999; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // ambient event pulse: sprite flare + ember beat along the actor's threads
    const pulse = { id: null as string | null, t0: -10000 };
    const unsub = subscribeEvents((e) => {
      pulse.id = e.actor;
      pulse.t0 = performance.now();
      if (reducedMotion()) drawStatic(performance.now());
    });

    const homeOf = (b: Boid, t: number, out: { x: number; y: number }) => {
      const a = b.homeA + t * 0.045 * b.dir; // slow orbital drift
      out.x = W / 2 + Math.cos(a) * b.homeR;
      out.y = H * 0.44 + Math.sin(a) * b.homeR * 0.55; // elliptical sky
    };

    let last = performance.now();
    const home = { x: 0, y: 0 };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      for (const b of boids) {
        let fx = 0, fy = 0;
        // flocking
        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, aliN = 0, cohX = 0, cohY = 0, cohN = 0;
        for (const o of boids) {
          if (o === b) continue;
          const dx = b.x - o.x, dy = b.y - o.y;
          const d = Math.hypot(dx, dy);
          if (d < 1) continue;
          if (d < SEP_R) { const s = (SEP_R - d) / SEP_R; sepX += (dx / d) * s; sepY += (dy / d) * s; }
          if (d < ALI_R) { aliX += o.vx; aliY += o.vy; aliN++; }
          if (d < COH_R) { cohX += o.x; cohY += o.y; cohN++; }
        }
        fx += sepX * SEP_W * 26; fy += sepY * SEP_W * 26;
        if (aliN > 0) {
          const avx = aliX / aliN, avy = aliY / aliN;
          fx += (avx - b.vx) * ALI_W * 1.6; fy += (avy - b.vy) * ALI_W * 1.6;
        }
        if (cohN > 0) {
          const cx = cohX / cohN, cy = cohY / cohN;
          const dx = cx - b.x, dy = cy - b.y;
          const d = Math.max(Math.hypot(dx, dy), 1);
          fx += (dx / d) * COH_W * 7; fy += (dy / d) * COH_W * 7;
        }
        // home-anchor spring (soft)
        homeOf(b, t, home);
        const hx = home.x - b.x, hy = home.y - b.y;
        const hd = Math.max(Math.hypot(hx, hy), 1);
        const spring = Math.min(hd / 90, 1) * 12;
        fx += (hx / hd) * spring; fy += (hy / hd) * spring;
        // cursor influence — they notice you
        const cdx = b.x - cursor.x, cdy = b.y - cursor.y;
        const cd = Math.hypot(cdx, cdy);
        if (cd < CURSOR_R && cd > 0.5) {
          const s = ((CURSOR_R - cd) / CURSOR_R) * CURSOR_W * 260;
          fx += (cdx / cd) * s; fy += (cdy / cd) * s;
        }
        b.vx = (b.vx + fx * dt) * 0.96;
        b.vy = (b.vy + fy * dt) * 0.96;
        const v = Math.hypot(b.vx, b.vy);
        if (v > MAX_V) { b.vx = (b.vx / v) * MAX_V; b.vy = (b.vy / v) * MAX_V; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.x = Math.max(24, Math.min(W - 24, b.x));
        b.y = Math.max(20, Math.min(H - 20, b.y));
        // label fade near cursor
        const near = Math.hypot(b.x - cursor.x, b.y - cursor.y) < 80;
        b.labelA += ((near ? 1 : 0) - b.labelA) * 0.08;
      }
    };

    const drawPulse = (now: number) => {
      const pk = (now - pulse.t0) / 600;
      return pk >= 0 && pk < 1 ? pk : -1;
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      const pk = drawPulse(now);

      // threads — peri light at distance-scaled alpha ≤ .20
      for (let i = 0; i < boids.length; i++) {
        for (let j = i + 1; j < boids.length; j++) {
          const a = boids[i], b = boids[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > THREAD_R) continue;
          const alpha = (1 - d / THREAD_R) * 0.2;
          ctx.strokeStyle = `rgba(139,156,249,${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          // ember beat travelling the actor's threads
          if (pk >= 0 && (a.agent.id === pulse.id || b.agent.id === pulse.id)) {
            const from = a.agent.id === pulse.id ? a : b;
            const to = from === a ? b : a;
            const px = from.x + (to.x - from.x) * pk;
            const py = from.y + (to.y - from.y) * pk;
            ctx.fillStyle = `rgba(255,107,74,${(0.85 * (1 - pk)).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // sprites — three-radius bloom per agent
      for (const b of boids) {
        const { core, alpha } = spriteColor(b.agent);
        const flare =
          pk >= 0 && b.agent.id === pulse.id ? 1 + 0.5 * Math.sin(Math.PI * pk) : 1;
        const R = b.r * flare;

        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 4.5);
        g.addColorStop(0, core + "B0");
        g.addColorStop(0.3, core + "38");
        g.addColorStop(1, core + "00");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, R * 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
        ctx.fill();

        if (b.agent.status === "running") {
          ctx.strokeStyle = "rgba(255,107,74,.65)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(b.x, b.y, R + 2.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // name fades in only near the cursor
        if (b.labelA > 0.02) {
          ctx.globalAlpha = b.labelA;
          ctx.font = "11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#9B94BE";
          ctx.fillText(b.agent.name, b.x, b.y + R + 14);
          ctx.globalAlpha = 1;
        }
      }
    };

    const drawStatic = (now: number) => {
      for (const b of boids) {
        homeOf(b, 6, home); // frozen at 50% of the ambient cycle
        b.x = home.x; b.y = home.y;
      }
      render(now);
    };

    let unregister: (() => void) | null = null;
    if (reducedMotion()) {
      drawStatic(performance.now());
      const onR = () => drawStatic(performance.now());
      window.addEventListener("resize", onR);
      unregister = () => window.removeEventListener("resize", onR);
    } else {
      unregister = registerDraw((now) => {
        step(now);
        render(now);
      });
    }

    return () => {
      unregister?.();
      unsub();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
