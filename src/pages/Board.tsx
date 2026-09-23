import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Film, Workflow, Users } from "lucide-react";
import { Orb, type OrbFx } from "@/components/Orb";
import { Sparkline } from "@/components/Sparkline";
import { StatusPill, agentOrbState } from "@/components/StatusPill";
import { SwarmField } from "@/components/SwarmField";
import { CountUp } from "@/components/CountUp";
import { Reveal, RevealItem } from "@/components/Reveal";
import { agentsData, auditEvents, cronsData, flowsData, generationsData } from "@/lib/data";
import { eventCaption, eventTickerLine, subscribeEvents } from "@/lib/live";
import { nextFire, firingsInRange } from "@/lib/cron";
import { countdown, relTime } from "@/lib/time";
import { useNow } from "@/hooks/useNow";
import { Activity, Moon, WifiOff, Zap, type LucideIcon } from "lucide-react";
import type { AgentStatus } from "@/types/data";
import type { OrbState } from "@/components/Orb";

const STATUS_META: Record<AgentStatus, { icon: LucideIcon; label: string; tone: "ok" | "warn" | "bad" | "peri" | "lo" | "ember" }> = {
  active: { icon: Zap, label: "active", tone: "ok" },
  running: { icon: Activity, label: "running", tone: "ember" },
  idle: { icon: Moon, label: "idle", tone: "lo" },
  offline: { icon: WifiOff, label: "offline", tone: "lo" },
};

const CHIPS: { label: string; to: string }[] = [
  { label: "Plan the week", to: "/sprints" },
  { label: "Run newsletter draft", to: "/flows" },
  { label: "Replay last flow", to: "/flows" },
  { label: "Review the queue", to: "/sprints" },
  { label: "Open second brain", to: "/memory" },
  { label: "Sweep the system", to: "/crons" },
];

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function perDay(dates: string[], days: number, now: number): number[] {
  const out = new Array(days).fill(0);
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    const d = Math.floor((now - t) / 86400000);
    if (d >= 0 && d < days) out[days - 1 - d]++;
  }
  return out;
}

/** Consciousness stream — one-line mono ticker of the real audit trail. */
function ConsciousnessStream() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dur, setDur] = useState(60);
  const text = auditEvents.map(eventTickerLine).join("   ·   ") + "   ·   ";
  useEffect(() => {
    const el = trackRef.current;
    if (el) setDur(Math.max(12, el.scrollWidth / 2 / 30)); // 30px/s
  }, [text]);
  return (
    <div className="ticker-mask mt-6 overflow-hidden" title="The audit trail — events.jsonl, live">
      <div
        ref={trackRef}
        className="ticker-track font-mono text-[12px] text-lo"
        style={{ animationDuration: `${dur}s` }}
      >
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  );
}

export default function Board() {
  const now = useNow(1000);
  const [videoOk, setVideoOk] = useState(true);
  // hero orb scale-in is part of the once-per-session boot sequence
  const [bootedOnce] = useState(() => sessionStorage.getItem("rubricpp.booted") === "1");

  // ── soul layer: gaze channel, thought cycle, event pulse ──
  const heroFx = useRef<OrbFx>({ gaze: { x: 0, y: 0 }, pulseAt: -10000 });
  const orbWrapRef = useRef<HTMLDivElement>(null);
  const [heroState, setHeroState] = useState<OrbState>("idle");
  const [thoughtIdx, setThoughtIdx] = useState(0);

  // autonomous thought cycle: every 18–26s the hero thinks for ~4s,
  // and the thought line rotates to the next real audit event
  useEffect(() => {
    let alive = true;
    let t1 = 0;
    let t2 = 0;
    const schedule = () => {
      t1 = window.setTimeout(() => {
        if (!alive) return;
        setHeroState("thinking");
        setThoughtIdx((i) => (i + 1) % Math.max(auditEvents.length, 1));
        t2 = window.setTimeout(() => {
          if (!alive) return;
          setHeroState("idle");
          schedule();
        }, 4000);
      }, 18000 + Math.random() * 8000);
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // event reaction: one ember-tinted luminance pulse (600ms, handled in-shader)
  useEffect(() => subscribeEvents(() => {
    heroFx.current.pulseAt = performance.now();
  }), []);

  // cursor gaze — the agent looks at you (≤400px reach)
  const onHeroMove = (e: React.PointerEvent) => {
    const el = orbWrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d < 400) {
      const s = Math.min(d / 400, 1);
      heroFx.current.gaze = { x: (dx / (d || 1)) * s, y: -(dy / (d || 1)) * s };
    } else {
      heroFx.current.gaze = { x: 0, y: 0 };
    }
  };
  const onHeroLeave = () => {
    heroFx.current.gaze = { x: 0, y: 0 };
  };

  const active = agentsData.agents.filter((a) => a.status !== "offline").length;

  const nextCron = useMemo(() => {
    let best: { name: string; at: Date } | null = null;
    for (const c of cronsData.crons) {
      if (!c.enabled) continue;
      const nf = nextFire(c.schedule, new Date(now));
      if (nf && (!best || nf < best.at)) best = { name: c.name, at: nf };
    }
    return best;
  }, [now]);

  const flowsToday = useMemo(() => {
    const today = new Date(now).toDateString();
    return flowsData.flows.reduce(
      (n, f) => n + f.runs.filter((r) => new Date(r.started).toDateString() === today).length, 0
    );
  }, [now]);

  const gensThisWeek = useMemo(() => {
    const weekAgo = now - 7 * 86400000;
    return generationsData.generations.filter((g) => new Date(g.ts).getTime() >= weekAgo).length;
  }, [now]);

  const genSpark = useMemo(
    () => perDay(generationsData.generations.map((g) => g.ts), 14, now),
    [now]
  );
  const flowSpark = useMemo(
    () => perDay(flowsData.flows.flatMap((f) => f.runs.map((r) => r.started)), 14, now),
    [now]
  );
  const cronSpark = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const days = new Array(7).fill(0);
    for (const c of cronsData.crons) {
      if (!c.enabled) continue;
      for (const f of firingsInRange(c.schedule, start, 7)) {
        const d = Math.floor((f.date.getTime() - start.getTime()) / 86400000);
        if (d >= 0 && d < 7) days[d]++;
      }
    }
    return days;
  }, [now]);

  const tiles = [
    {
      icon: Users, label: "Active agents", num: active as number | null,
      caption: `of ${agentsData.agents.length} on roster`, spark: null as number[] | null, to: "/agents",
      small: false,
    },
    {
      icon: CalendarClock, label: "Next firing", num: null as number | null,
      value: nextCron ? countdown(nextCron.at.getTime(), now).replace(/^in /, "") : "—",
      caption: nextCron ? nextCron.name : "no enabled crons", spark: cronSpark, to: "/crons",
      small: true, // countdown strings step down so they never wrap
    },
    {
      icon: Workflow, label: "Flows today", num: flowsToday as number | null,
      caption: "runs started", spark: flowSpark, to: "/flows",
      small: false,
    },
    {
      icon: Film, label: "Generations", num: gensThisWeek as number | null,
      caption: "this week", spark: genSpark, to: "/generations",
      small: false,
    },
  ];

  return (
    <div>
      {/* ── Zenith: hero — the swarm's sky (≥50% void stays sacred) ── */}
      <section
        className="relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-[24px]"
        onPointerMove={onHeroMove}
        onPointerLeave={onHeroLeave}
      >
        {/* ambient video under the shader layer; silently hidden if absent */}
        {videoOk && (
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18] mix-blend-screen"
            autoPlay muted loop playsInline
            src="media/nebula-loop.mp4"
            onError={() => setVideoOk(false)}
            aria-hidden
          />
        )}
        {/* the living swarm — boids flocking in the hero void */}
        <SwarmField />

        <motion.div
          ref={orbWrapRef}
          initial={bootedOnce ? false : { scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          className="bloom relative z-10 rounded-full"
        >
          <Orb size={200} state={heroState} seedKey="robo" title="Robo — chief of staff" fxRef={heroFx} />
        </motion.div>

        <h1 className="relative z-10 mt-10 text-center font-display text-[44px] leading-[48px] tracking-tight">
          <span className="font-light text-hi/90">Good {greetingWord()}, Chief.</span>
          <br />
          <span className="font-bold text-hi">
            The swarm <em className="font-serif italic font-normal text-lav-200">remembers</em>.
          </span>
        </h1>

        {/* thought line — rotates with each autonomous thought cycle */}
        <div className="relative z-10 mt-3 flex h-[18px] items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={thoughtIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.48, ease: [0.65, 0, 0.35, 1] }}
              className="font-mono text-[12px] text-lo"
            >
              {auditEvents.length > 0 ? `▸ ${eventCaption(auditEvents[thoughtIdx % auditEvents.length])}` : ""}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="relative z-10 mt-5 flex max-w-[560px] flex-wrap items-center justify-center gap-2.5">
          {CHIPS.map((c, i) => (
            <Link
              key={c.label}
              to={c.to}
              className={
                i === 0
                  ? "cta-ember press rounded-[10px] px-3.5 py-1.5 text-[13px]"
                  : "glass glass-sm lift press px-3.5 py-1.5 text-[13px] text-lo hover:text-hi"
              }
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* consciousness stream — the audit trail, always murmuring */}
      <ConsciousnessStream />

      {/* ── Instruments ── */}
      <Reveal className="mt-12">
        <RevealItem className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] font-semibold">Instruments</h2>
          <span className="micro">Who's active and what they're doing</span>
        </RevealItem>

        <RevealItem>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} to={t.to} className="glass lift block p-5">
                <div className="flex items-center justify-between">
                  <span className="micro">{t.label}</span>
                  <t.icon size={14} className="text-lo" aria-hidden />
                </div>
                <div
                  className={`tnum mt-3 whitespace-nowrap font-display font-medium text-hi ${
                    t.small ? "text-warm-grad text-[32px] leading-[44px]" : "text-[44px] leading-[44px]"
                  }`}
                >
                  {t.num !== null ? <CountUp value={t.num} /> : t.value}
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="truncate text-[12px] leading-[16px] text-lo">{t.caption}</span>
                  {t.spark && <Sparkline values={t.spark} width={88} height={26} endDot={t.small} />}
                </div>
              </Link>
            ))}
          </div>
        </RevealItem>

        {/* swarm strip — all six agents breathing */}
        <RevealItem className="glass glass-lg mt-4 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="micro">Swarm</span>
            <Link to="/agents" className="tlink text-[12px]">
              Open roster →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {agentsData.agents.map((a) => {
              const meta = STATUS_META[a.status];
              return (
                <div key={a.id} className="glass glass-sm lift flex flex-col items-center gap-2 p-4 text-center">
                  <Orb size={52} state={agentOrbState(a.status)} seedKey={a.id} title={a.name} />
                  <div className="font-display text-[14px] font-medium">{a.name}</div>
                  <StatusPill icon={meta.icon} label={meta.label} tone={meta.tone} />
                  <p className="line-clamp-2 text-[12px] leading-[16px] text-lo">{a.lastTask}</p>
                  <span className="tnum text-[11px] text-lo/60">{relTime(a.lastActive, now)}</span>
                </div>
              );
            })}
          </div>
        </RevealItem>
      </Reveal>
    </div>
  );
}
