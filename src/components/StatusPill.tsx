import type { LucideIcon } from "lucide-react";
import type { AgentStatus } from "@/types/data";
import type { OrbState } from "@/components/Orb";

/** Agent status → orb state (velocity = meaning).
 *  running maps to "acting": directional streak + ember rim at 15% blend —
 *  the warm signature of an agent mid-task. */
export function agentOrbState(status: AgentStatus): OrbState {
  switch (status) {
    case "running": return "acting";
    case "offline": return "offline";
    case "active": return "idle";
    case "idle": return "idle";
  }
}

interface PillProps {
  icon: LucideIcon;
  label: string;
  tone: "ok" | "warn" | "bad" | "peri" | "lo" | "ember";
  className?: string;
}

const TONE_CLASS: Record<PillProps["tone"], string> = {
  ok: "text-ok border-ok/25 bg-ok/10",
  warn: "text-warn border-warn/25 bg-warn/10",
  bad: "text-bad border-bad/25 bg-bad/10",
  peri: "text-peri-400 border-peri-400/25 bg-peri-400/10",
  lo: "text-lo border-hi/10 bg-hi/5",
  ember: "text-ember-400 border-ember-400/30 bg-ember-400/10",
};

/** Status pill — status is NEVER encoded by color alone: icon + label always. */
export function StatusPill({ icon: Icon, label, tone, className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[12px] leading-[16px] font-medium ${TONE_CLASS[tone]} ${className}`}
    >
      <Icon size={12} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  );
}
