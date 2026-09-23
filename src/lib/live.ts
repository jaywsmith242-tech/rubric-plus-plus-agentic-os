/** Ambient event bus — replays the real events.jsonl audit stream on a 45s
 *  cycle so every surface (topbar dot, hero orb, swarm field) reacts to the
 *  same "live" event at the same moment. */

import { auditEvents } from "@/lib/data";
import type { AuditEvent } from "@/types/data";

type Listener = (e: AuditEvent, idx: number) => void;

const listeners = new Set<Listener>();
let idx = auditEvents.length > 0 ? auditEvents.length - 1 : 0;
let timer: number | null = null;

function ensureTimer() {
  if (timer !== null || auditEvents.length === 0 || listeners.size === 0) return;
  timer = window.setInterval(() => {
    idx = (idx + 1) % auditEvents.length;
    const e = auditEvents[idx];
    listeners.forEach((l) => l(e, idx));
  }, 45000);
}

export function subscribeEvents(l: Listener): () => void {
  listeners.add(l);
  ensureTimer();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export function currentEvent(): AuditEvent | null {
  return auditEvents[idx] ?? null;
}

function detail(e: AuditEvent): string {
  const p = e.payload as Record<string, unknown>;
  switch (e.action) {
    case "routine-fired": return `${p.cron} — ${p.status}`;
    case "append": return `${p.id} · ${p.type} · ${p.model}`;
    case "run-started": return `${p.flow} · ${p.run}`;
    case "step-event": return `${p.flow} · ${p.step} ${p.status}`;
    case "status": return `${p.id} → ${p.status}`;
    default: return Object.values(p).join(" · ");
  }
}

/** Thought-line caption: "robo · morning-brief — done". */
export function eventCaption(e: AuditEvent): string {
  return `${e.actor} · ${detail(e)}`;
}

/** Consciousness-stream entry: "▸ 08:00:00 eddo run-started — yt-to-substack". */
export function eventTickerLine(e: AuditEvent): string {
  const d = new Date(e.ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `▸ ${t} ${e.actor} ${e.action} — ${detail(e)}`;
}
