import { useMemo } from "react";
import { Ban, CheckCircle2, Eye, XCircle, type LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { cronsData, agentById } from "@/lib/data";
import { firingsInRange, nextFire } from "@/lib/cron";
import { countdown, relTime } from "@/lib/time";
import { useNow } from "@/hooks/useNow";
import type { Cron } from "@/types/data";
import { Reveal, RevealItem } from "@/components/Reveal";

function statusMeta(c: Cron): { icon: LucideIcon; label: string; tone: "ok" | "warn" | "bad" | "lo" } {
  if (!c.enabled) return { icon: Ban, label: "disabled", tone: "lo" };
  if (c.lastStatus.includes("fail")) return { icon: XCircle, label: "failed", tone: "bad" };
  if (c.lastStatus.includes("waiting")) return { icon: Eye, label: "waiting review", tone: "warn" };
  return { icon: CheckCircle2, label: "done", tone: "ok" };
}

/** ember is rationed to attention: human-review gates and failures only */
function firingHot(c: Cron): boolean {
  return c.lastStatus.includes("fail") || c.lastStatus.includes("waiting");
}

export default function Crons() {
  const now = useNow(1000);

  const days = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime() + i * 86400000);
      const firings = cronsData.crons
        .filter((c) => c.enabled)
        .flatMap((c) =>
          firingsInRange(c.schedule, d, 1)
            .filter((f) => f.date.toDateString() === d.toDateString())
            .map((f) => ({ cron: c, at: f.date }))
        )
        .sort((a, b) => a.at.getTime() - b.at.getTime());
      return { date: d, firings, today: i === 0 };
    });
  }, [now]);

  const DAY_FMT = new Intl.DateTimeFormat("en", { weekday: "short" });

  return (
    <Reveal className="pt-10">
      <RevealItem>
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">Cron schedule</h1>
        <p className="mt-1 text-[15px] text-lo">Every recurring job in one place.</p>
      </header>
      </RevealItem>

      {/* ── 7-day star chart ── */}
      <RevealItem>
      <section className="glass glass-lg mb-6 p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <span className="micro">Week view — 7 days from today</span>
          <span className="text-[11px] text-lo/60">peri = routine · ember = needs you</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const visible = day.firings.slice(0, 3);
            const hidden = day.firings.slice(3);
            return (
              <div
                key={day.date.toISOString()}
                className={`flex h-[180px] flex-col rounded-[10px] border px-1.5 py-2 ${
                  day.today
                    ? "border-violet-500/35 bg-violet-500/[.07]"
                    : "border-hi/[.05] bg-void-900/40"
                }`}
              >
                <div className="mb-1.5 flex items-baseline justify-between px-0.5">
                  <span className={`text-[11px] font-medium ${day.today ? "text-lav-200" : "text-lo"}`}>
                    {day.today ? "Today" : DAY_FMT.format(day.date)}
                  </span>
                  <span className="tnum text-[10px] text-lo/50">{day.date.getDate()}</span>
                </div>
                {/* chips stacked vertically, 6px gaps, max 3 then "+N more" */}
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  {visible.map((f, i) => {
                    const hot = firingHot(f.cron);
                    const hh = String(f.at.getHours()).padStart(2, "0");
                    const mm = String(f.at.getMinutes()).padStart(2, "0");
                    return (
                      <div
                        key={`${f.cron.id}-${i}`}
                        className="group flex min-w-0 items-center gap-1.5 rounded-[10px] border border-hi/[.05] bg-void-950/40 px-1.5 py-1 transition-colors duration-hover hover:border-hi/[.12]"
                        title={`${f.cron.name} — ${hh}:${mm} · ${f.cron.host}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${hot ? "bg-ember-400" : "bg-peri-400"}`}
                          style={{
                            boxShadow: hot
                              ? "0 0 6px rgb(var(--ember-400)/.9), 0 0 16px rgb(var(--ember-400)/.35)"
                              : "0 0 6px rgb(var(--peri-400)/.8), 0 0 14px rgb(var(--peri-400)/.3)",
                          }}
                        />
                        <span className="min-w-0 truncate text-[11px] leading-[14px] text-lo group-hover:text-hi">
                          <span className="tnum text-hi/70">{hh}:{mm}</span> {f.cron.name}
                        </span>
                      </div>
                    );
                  })}
                  {hidden.length > 0 && (
                    <div
                      className="flex items-center justify-center rounded-[10px] border border-dashed border-hi/[.08] px-1.5 py-1 text-[11px] leading-[14px] text-lo/60"
                      title={hidden
                        .map(
                          (f) =>
                            `${String(f.at.getHours()).padStart(2, "0")}:${String(f.at.getMinutes()).padStart(2, "0")} ${f.cron.name}`
                        )
                        .join("\n")}
                    >
                      +{hidden.length} more
                    </div>
                  )}
                  {day.firings.length === 0 && (
                    <div className="flex flex-1 items-center justify-center text-[10px] text-lo/30">quiet</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </RevealItem>

      {/* ── table ── */}
      <RevealItem>
      <section className="glass glass-lg overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-hi/[.07]">
              {["Job", "Schedule", "Host", "Agent", "Last run", "Status", "Next fire"].map((h) => (
                <th key={h} className="micro px-5 py-3.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cronsData.crons.map((c) => {
              const meta = statusMeta(c);
              const nf = c.enabled ? nextFire(c.schedule, new Date(now)) : null;
              return (
                <tr
                  key={c.id}
                  className={`border-b border-hi/[.04] transition-colors duration-hover hover:bg-raise-800/40 ${
                    c.enabled ? "" : "opacity-45"
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-hi">{c.name}</div>
                    {c.artifact && (
                      <div className="mt-0.5 max-w-[220px] truncate font-mono text-[11px] text-lo/60">{c.artifact}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-[12px] text-peri-300">{c.schedule}</div>
                    <div className="text-[11px] text-lo">{c.human}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-sm border border-hi/[.08] bg-raise-800/60 px-2 py-0.5 font-mono text-[11px] text-lo">
                      {c.host}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-hi/85">{agentById.get(c.agent)?.name ?? c.agent}</td>
                  <td className="tnum px-5 py-3.5 text-lo">{relTime(c.lastRun, now)}</td>
                  <td className="px-5 py-3.5">
                    <StatusPill icon={meta.icon} label={meta.label} tone={meta.tone} />
                  </td>
                  <td className="tnum px-5 py-3.5 text-hi/90">
                    {c.enabled ? (nf ? countdown(nf.getTime(), now) : "—") : "disabled"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      </RevealItem>
    </Reveal>
  );
}
