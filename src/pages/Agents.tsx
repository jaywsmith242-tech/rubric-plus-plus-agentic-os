import { Orb } from "@/components/Orb";
import { StatusPill, agentOrbState } from "@/components/StatusPill";
import { agentsData } from "@/lib/data";
import { relTime } from "@/lib/time";
import { useNow } from "@/hooks/useNow";
import { Activity, Moon, WifiOff, Zap, type LucideIcon } from "lucide-react";
import type { Agent, AgentStatus } from "@/types/data";

const STATUS_META: Record<AgentStatus, { icon: LucideIcon; label: string; tone: "ok" | "peri" | "lo" }> = {
  active: { icon: Zap, label: "active", tone: "ok" },
  running: { icon: Activity, label: "running", tone: "peri" },
  idle: { icon: Moon, label: "idle", tone: "lo" },
  offline: { icon: WifiOff, label: "offline", tone: "lo" },
};

function AgentCard({ a, now }: { a: Agent; now: number }) {
  const meta = STATUS_META[a.status];
  return (
    <div className="glass lift p-6 transition-transform duration-hover hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <Orb size={64} state={agentOrbState(a.status)} seedKey={a.id} title={`${a.name} — ${a.status}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-[19px] font-medium">{a.name}</h3>
            <StatusPill icon={meta.icon} label={meta.label} tone={meta.tone} />
          </div>
          <div className="mt-0.5 text-[13px] text-lo">{a.role}</div>
          <div className="mt-2 inline-flex rounded-sm border border-hi/[.07] bg-void-900/60 px-2 py-0.5 font-mono text-[11px] text-peri-300">
            {a.model}
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-hi/[.06] pt-4">
        <div className="micro mb-1.5">Last task</div>
        <p className="text-[14px] leading-[22px] text-hi/85">{a.lastTask}</p>
        <div className="tnum mt-2 text-[12px] text-lo/70">{relTime(a.lastActive, now)}</div>
      </div>
    </div>
  );
}

export default function Agents() {
  const now = useNow(30000);
  const orchestrator = agentsData.agents.find((a) => a.id === "robo");
  const departments = agentsData.agents.filter((a) => a.id !== "robo");

  return (
    <div className="pt-10">
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">Agent team</h1>
        <p className="mt-1 text-[15px] text-lo">Who's active and what they're doing.</p>
      </header>

      <section>
        <div className="micro mb-4">Orchestrator</div>
        {orchestrator && (
          <div className="max-w-[560px]">
            <AgentCard a={orchestrator} now={now} />
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="micro mb-4">Departments</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((a) => (
            <AgentCard key={a.id} a={a} now={now} />
          ))}
        </div>
      </section>
    </div>
  );
}
