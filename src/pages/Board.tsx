import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { CalendarClock, Film, Workflow, Users } from "lucide-react";
import { Orb } from "@/components/Orb";
import { Sparkline } from "@/components/Sparkline";
import { StatusPill, agentOrbState } from "@/components/StatusPill";
import { agentsData, cronsData, flowsData, generationsData } from "@/lib/data";
import { nextFire, firingsInRange } from "@/lib/cron";
import { countdown, relTime } from "@/lib/time";
import { useNow } from "@/hooks/useNow";
import { Activity, Moon, WifiOff, Zap, type LucideIcon } from "lucide-react";
import type { AgentStatus } from "@/types/data";

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

export default function Board() {
  const now = useNow(1000);
  const [videoOk, setVideoOk] = useState(true);
  // hero orb scale-in is part of the once-per-session boot sequence
  const [bootedOnce] = useState(() => sessionStorage.getItem("rubricpp.booted") === "1");

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
      icon: Users, label: "Active agents", value: String(active),
      caption: `of ${agentsData.agents.length} on roster`, spark: null as number[] | null, to: "/agents",
      small: false,
    },
    {
      icon: CalendarClock, label: "Next firing", value: nextCron ? countdown(nextCron.at.getTime(), now).replace(/^in /, "") : "—",
      caption: nextCron ? nextCron.name : "no enabled crons", spark: cronSpark, to: "/crons",
      small: true, // countdown strings step down so they never wrap
    },
    {
      icon: Workflow, label: "Flows today", value: String(flowsToday),
      caption: "runs started", spark: flowSpark, to: "/flows",
      small: false,
    },
    {
      icon: Film, label: "Generations", value: String(gensThisWeek),
      caption: "this week", spark: genSpark, to: "/generations",
      small: false,
    },
  ];

  return (
    <div>
      {/* ── Zenith: hero — ≥50% emptiness, the void is the luxury ── */}
      <section className="relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-[24px]">
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
        <motion.div
          initial={bootedOnce ? false : { scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          className="bloom rounded-full"
        >
          <Orb size={200} state="idle" seedKey="robo" title="Robo — chief of staff" />
        </motion.div>

        <h1 className="mt-10 text-center font-display text-[44px] leading-[48px] tracking-tight">
          <span className="font-light text-hi/90">Good {greetingWord()}, Chief.</span>
          <br />
          <span className="font-bold text-hi">
            The swarm <em className="font-serif italic font-normal text-lav-200">remembers</em>.
          </span>
        </h1>

        <div className="mt-8 flex max-w-[560px] flex-wrap items-center justify-center gap-2.5">
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

      {/* ── Instruments ── */}
      <section className="mt-16">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] font-semibold">Instruments</h2>
          <span className="micro">Who's active and what they're doing</span>
        </div>

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
                {t.value}
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="truncate text-[12px] leading-[16px] text-lo">{t.caption}</span>
                {t.spark && <Sparkline values={t.spark} width={88} height={26} endDot={t.small} />}
              </div>
            </Link>
          ))}
        </div>

        {/* swarm strip — all six agents breathing */}
        <div className="glass glass-lg mt-4 p-5">
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
        </div>
      </section>
    </div>
  );
}
