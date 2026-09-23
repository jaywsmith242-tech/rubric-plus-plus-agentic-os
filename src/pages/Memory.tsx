import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { memoryData } from "@/lib/data";
import { rafLoop, reducedMotion } from "@/lib/gl";
import { fnv1a } from "@/lib/rng";
import type { MemoryNodeType } from "@/types/data";
import { Reveal, RevealItem } from "@/components/Reveal";

/** Memory Graph — "Second Brain" constellation. Canvas 2D force layout:
 *  pairwise repulsion (K=9000 capped), spring edges (rest 130), weak center
 *  gravity, damping 0.82, drag with pointer capture, hover brightens the
 *  neighborhood, click → glass info card, search dims others to 15%. */

const TYPE_COLOR: Record<MemoryNodeType, string> = {
  router: "#D6CCFF", // lav-200
  skill: "#8B9CF9",  // peri-400
  doc: "#9B94BE",    // text-lo
  data: "#6D5AE0",   // violet-500
};

interface PNode {
  id: string;
  type: MemoryNodeType;
  label: string;
  x: number; y: number; vx: number; vy: number;
  r: number;
}

export default function Memory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const nodes = useMemo<PNode[]>(() => {
    return memoryData.nodes.map((n) => {
      const h = fnv1a(n.id);
      return {
        ...n,
        x: 300 + (h % 400),
        y: 180 + ((h >> 8) % 300),
        vx: 0, vy: 0,
        r: n.type === "router" ? 7 : n.type === "skill" ? 5.5 : 4.5,
      };
    });
  }, []);
  const edges = memoryData.edges;
  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const [a, b] of edges) {
      if (!m.has(a)) m.set(a, new Set());
      if (!m.has(b)) m.set(b, new Set());
      m.get(a)!.add(b);
      m.get(b)!.add(a);
    }
    return m;
  }, [edges]);

  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const selRef = useRef<string | null>(null);
  const queryRef = useRef("");
  hoverRef.current = hoverId;
  selRef.current = selId;
  queryRef.current = query;

  const selected = nodes.find((n) => n.id === selId) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 800, H = 520;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = Math.max(420, Math.min(560, wrap.clientWidth * 0.55));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const byId = new Map(nodes.map((n) => [n.id, n]));

    const step = () => {
      // pairwise repulsion (raised so label boxes can clear each other)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = (i - j) * 0.5; dy = 0.3; d2 = 1; }
          d2 = Math.min(d2, 40000);
          const f = 14000 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      // springs
      for (const [aid, bid] of edges) {
        const a = byId.get(aid), b = byId.get(bid);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const f = (d - 130) * 0.012;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      // center gravity + integrate + clamp
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.0012;
        n.vy += (H / 2 - n.y) * 0.0012;
        if (drag.current?.id === n.id) { n.vx = 0; n.vy = 0; continue; }
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(40, Math.min(W - 40, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
      }
      // label-collision spacing: nodes own a box (glow point + label below);
      // push overlapping boxes apart along the axis of least penetration.
      const halfW = (n: PNode) => Math.max(n.r + 6, (n.label.length * 6.1) / 2 + 6);
      const halfH = () => 19; // node radius + gap + 11px label
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const ox = halfW(a) + halfW(b) - Math.abs(b.x - a.x);
            if (ox <= 0) continue;
            const oy = halfH() + halfH() - Math.abs(b.y - a.y);
            if (oy <= 0) continue;
            const aPinned = drag.current?.id === a.id;
            const bPinned = drag.current?.id === b.id;
            if (ox < oy) {
              const push = ox / 2 + 0.5;
              const dir = b.x >= a.x ? 1 : -1;
              if (!aPinned) a.x -= dir * push;
              if (!bPinned) b.x += dir * push;
            } else {
              const push = oy / 2 + 0.5;
              const dir = b.y >= a.y ? 1 : -1;
              if (!aPinned) a.y -= dir * push;
              if (!bPinned) b.y += dir * push;
            }
            a.x = Math.max(40, Math.min(W - 40, a.x));
            a.y = Math.max(30, Math.min(H - 30, a.y));
            b.x = Math.max(40, Math.min(W - 40, b.x));
            b.y = Math.max(30, Math.min(H - 30, b.y));
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const hov = hoverRef.current;
      const neighborhood = hov ? new Set([hov, ...(adjacency.get(hov) ?? [])]) : null;
      const query = queryRef.current.trim().toLowerCase();
      const match = (id: string, label: string) =>
        !query || label.toLowerCase().includes(query) || id.toLowerCase().includes(query);

      const dimOf = (n: PNode): number => {
        let alpha = 1;
        if (neighborhood) alpha = neighborhood.has(n.id) ? 1 : 0.22;
        if (query) alpha = Math.min(alpha, match(n.id, n.label) ? 1 : 0.15);
        return alpha;
      };

      // edges — luminous hairline light trails: 2px glow pass + 1px core pass
      for (const [aid, bid] of edges) {
        const a = byId.get(aid), b = byId.get(bid);
        if (!a || !b) continue;
        const lit = neighborhood && neighborhood.has(aid) && neighborhood.has(bid) && (aid === hov || bid === hov);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        // glow pass
        ctx.strokeStyle = lit ? "rgba(139,156,249,.28)" : "rgba(139,156,249,.09)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // core pass — peri at ~25%, brightening to ~60% in the hovered neighborhood
        ctx.strokeStyle = lit ? "rgba(177,156,228,.60)" : "rgba(139,156,249,.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // nodes — glow points
      for (const n of nodes) {
        const alpha = dimOf(n);
        const color = TYPE_COLOR[n.type];
        const isSel = selRef.current === n.id;
        const isHov = hoverRef.current === n.id;
        const R = n.r * (isHov || isSel ? 1.35 : 1);

        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R * 4);
        g.addColorStop(0, color + "CC");
        g.addColorStop(0.35, color + "44");
        g.addColorStop(1, color + "00");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, R * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, R, 0, Math.PI * 2);
        ctx.fill();
        if (isSel) {
          ctx.strokeStyle = "rgba(234,249,243,.85)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, R + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = "11px Inter, sans-serif";
        ctx.fillStyle = `rgba(237,234,250,${0.8 * alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + R + 14);
        ctx.globalAlpha = 1;
      }
    };

    const reduced = reducedMotion();
    const stop = reduced
      ? (() => { for (let i = 0; i < 220; i++) step(); draw(); const onR = () => draw(); window.addEventListener("resize", onR); return () => window.removeEventListener("resize", onR); })()
      : rafLoop(() => { step(); draw(); });

    // pointer interaction
    const pick = (mx: number, my: number): PNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (Math.hypot(n.x - mx, n.y - my) < n.r + 10) return n;
      }
      return null;
    };
    const pos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    let downAt = 0;
    const onDown = (e: PointerEvent) => {
      const { x, y } = pos(e);
      const n = pick(x, y);
      if (n) {
        drag.current = { id: n.id, dx: n.x - x, dy: n.y - y };
        canvas.setPointerCapture(e.pointerId);
        downAt = Date.now();
      }
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = pos(e);
      if (drag.current) {
        const n = byId.get(drag.current.id);
        if (n) { n.x = x + drag.current.dx; n.y = y + drag.current.dy; }
        if (reduced) draw();
      } else {
        const n = pick(x, y);
        setHoverId(n?.id ?? null);
        canvas.style.cursor = n ? "pointer" : "default";
      }
    };
    const onUp = (e: PointerEvent) => {
      if (drag.current && Date.now() - downAt < 250) {
        const { x, y } = pos(e);
        const n = pick(x, y);
        setSelId((cur) => (n && cur !== n.id ? n.id : n ? cur : null));
      }
      drag.current = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);

    return () => {
      stop();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [nodes, edges, adjacency]);

  return (
    <Reveal className="pt-10">
      <RevealItem>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[36px] font-semibold leading-[44px]">Second brain</h1>
          <p className="mt-1 text-[15px] text-lo">
            The workspace as a graph — routers, skills, docs and data. Drag the stars.
          </p>
        </div>
        <label className="glass glass-sm flex items-center gap-2 px-3 py-2">
          <Search size={14} className="text-lo" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="w-[180px] bg-transparent text-[13px] text-hi placeholder:text-lo/50 focus:outline-none"
          />
        </label>
      </header>
      </RevealItem>

      <RevealItem>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div ref={wrapRef} className="glass glass-lg overflow-hidden">
          <canvas ref={canvasRef} className="block w-full" />
        </div>

        <aside className="space-y-4">
          {selected ? (
            <div className="glass glass-lg p-5">
              <div className="micro mb-2">{selected.type}</div>
              <h3 className="font-mono text-[15px] text-hi">{selected.id}</h3>
              <p className="mt-3 text-[13px] leading-[20px] text-lo">
                {selected.type === "router" && "Router file — agents parse these to route context just-in-time."}
                {selected.type === "skill" && "Skill folder — a capability with a SKILL.md contract."}
                {selected.type === "doc" && "Doc — the same markdown the agents load as context."}
                {selected.type === "data" && "Data file — part of the files-as-database layer."}
              </p>
              <div className="mt-4 border-t border-hi/[.06] pt-3">
                <div className="micro mb-1.5">Edges</div>
                <div className="tnum font-display text-[26px] text-lav-200">
                  {edges.filter(([a, b]) => a === selected.id || b === selected.id).length}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass glass-lg p-5 text-[13px] leading-[22px] text-lo">
              Click a node to inspect it. Hover to light up its neighborhood. Search dims everything else to 15%.
            </div>
          )}

          <div className="glass glass-lg p-5">
            <div className="micro mb-3">Legend</div>
            <div className="space-y-2">
              {(Object.keys(TYPE_COLOR) as MemoryNodeType[]).map((t) => (
                <div key={t} className="flex items-center gap-2.5 text-[12px] text-lo">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: TYPE_COLOR[t], boxShadow: `0 0 8px ${TYPE_COLOR[t]}88` }}
                    aria-hidden
                  />
                  {t}
                  <span className="tnum ml-auto text-lo/50">
                    {memoryData.nodes.filter((n) => n.type === t).length}
                  </span>
                </div>
              ))}
              <div className="mt-3 border-t border-hi/[.06] pt-3 text-[11px] text-lo/60">
                {memoryData.nodes.length} nodes · {edges.length} edges
              </div>
            </div>
          </div>
        </aside>
      </div>
      </RevealItem>
    </Reveal>
  );
}
