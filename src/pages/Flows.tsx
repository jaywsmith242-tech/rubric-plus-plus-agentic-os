import { useEffect, useMemo, useState } from "react";
import { Play, Square, User } from "lucide-react";
import { Orb, type OrbState } from "@/components/Orb";
import { flowsData, agentById } from "@/lib/data";
import { fmtTime, relTime } from "@/lib/time";
import type { Flow, FlowRun, StepStatus } from "@/types/data";
import { Reveal, RevealItem } from "@/components/Reveal";

/** cumulative latest status per step from an event prefix (append-only log IS the state) */
function stepStates(run: FlowRun, upto: number): Map<string, StepStatus> {
  const m = new Map<string, StepStatus>();
  for (let i = 0; i < upto && i < run.events.length; i++) {
    m.set(run.events[i].step, run.events[i].status);
  }
  return m;
}

function stepOrb(status: StepStatus | undefined, isHuman: boolean): OrbState {
  if (!status) return "offline";
  switch (status) {
    case "done": return "idle";
    case "running": return "thinking";
    case "failed": return "error";
    case "waiting": return isHuman ? "acting" : "offline";
  }
}

const STATUS_TEXT: Record<StepStatus, string> = {
  done: "text-peri-400",
  running: "text-violet-400",
  waiting: "text-lo",
  failed: "text-bad",
};

function StepNode({
  label, agent, status, isHuman,
}: {
  label: string; agent: string; status: StepStatus | undefined; isHuman: boolean;
}) {
  const ring =
    status === "failed"
      ? "ring-1 ring-iron-600/80"
      : isHuman && status === "waiting"
        ? "ring-1 ring-ember-400/70"
        : status === "done"
          ? "ring-1 ring-peri-400/40"
          : status === "running"
            ? "ring-1 ring-violet-400/60"
            : "ring-1 ring-hi/10";
  const agentName = isHuman ? "human" : agentById.get(agent)?.name ?? agent;
  return (
    <div className="flex w-[132px] shrink-0 flex-col items-center gap-2 text-center">
      <div className={`rounded-full ${ring} transition-shadow duration-state ease-state`}>
        <Orb size={48} state={stepOrb(status, isHuman)} seedKey={`step-${label}`} title={label} />
      </div>
      <div className="text-[12px] leading-[16px] text-hi/85">{label}</div>
      <div className="flex items-center gap-1 text-[11px] text-lo">
        {isHuman && <User size={10} className="text-ember-400" aria-hidden />}
        <span className={isHuman ? "text-ember-400" : ""}>{agentName}</span>
      </div>
      <div className={`font-mono text-[10px] uppercase tracking-wider ${status ? STATUS_TEXT[status] : "text-lo/40"}`}>
        {status ?? "pending"}
      </div>
    </div>
  );
}

export default function Flows() {
  const [flowId, setFlowId] = useState(flowsData.flows[0]?.id ?? "");
  const flow: Flow | undefined = flowsData.flows.find((f) => f.id === flowId) ?? flowsData.flows[0];
  const run = flow?.runs[flow.runs.length - 1];

  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState<number>(run?.events.length ?? 0);

  // reset when switching flows
  useEffect(() => {
    setPlaying(false);
    setCursor(run?.events.length ?? 0);
  }, [flowId, run?.events.length]);

  // playback: 750ms per event, painting cumulative states
  useEffect(() => {
    if (!playing || !run) return;
    const id = window.setInterval(() => {
      setCursor((c) => {
        if (c >= run.events.length) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 750);
    return () => window.clearInterval(id);
  }, [playing, run]);

  const states = useMemo(() => (run ? stepStates(run, cursor) : new Map<string, StepStatus>()), [run, cursor]);

  if (!flow || !run) return null;

  return (
    <Reveal className="pt-10">
      <RevealItem>
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">Flow pipelines</h1>
        <p className="mt-1 text-[15px] text-lo">Follow every step your agents take.</p>
      </header>
      </RevealItem>

      <RevealItem>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* flow list */}
        <aside className="space-y-2">
          {flowsData.flows.map((f) => {
            const last = f.runs[f.runs.length - 1];
            const activeRow = f.id === flow.id;
            return (
              <button
                key={f.id}
                onClick={() => setFlowId(f.id)}
                className={`glass glass-sm lift block w-full p-4 text-left ${
                  activeRow ? "border-violet-500/40 bg-raise-700/50" : ""
                }`}
              >
                <div className="text-[14px] font-medium text-hi">{f.name}</div>
                <div className="mt-1 font-mono text-[11px] text-lo">{f.trigger}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-lo/70">
                  <span>{f.steps.length} steps</span>
                  <span className="tnum">{relTime(last.started)}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* constellation + log */}
        <div className="space-y-4">
          <div className="glass glass-lg p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-display text-[17px] font-semibold">{flow.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-lo">
                  {run.id} · started {fmtTime(run.started)}
                </div>
              </div>
              <button
                onClick={() => {
                  if (playing) { setPlaying(false); setCursor(run.events.length); }
                  else { setCursor(0); setPlaying(true); }
                }}
                className="cta-ember press flex items-center gap-2 rounded-[10px] px-3.5 py-1.5 text-[13px]"
              >
                {playing ? <Square size={13} aria-hidden /> : <Play size={13} aria-hidden />}
                {playing ? "Stop" : "Playback"}
              </button>
            </div>

            {/* step constellation — nodes connected by luminous trails */}
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max items-start">
                {flow.steps.map((s, i) => {
                  const st = states.get(s.id);
                  const prevDone = i > 0 && states.has(flow.steps[i - 1].id);
                  return (
                    <div key={s.id} className="flex items-start">
                      {i > 0 && (
                        <div
                          className={`mx-1 mt-[24px] h-px w-10 transition-colors duration-state ease-state ${
                            prevDone
                              ? "bg-gradient-to-r from-peri-400/70 to-violet-400/50 shadow-[0_0_8px_rgb(var(--peri-400)/.5)]"
                              : "bg-hi/10"
                          }`}
                        />
                      )}
                      <StepNode label={s.label} agent={s.agent} status={st} isHuman={s.agent === "human"} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* event log — JetBrains Mono, the append-only truth */}
          <div className="glass p-5">
            <div className="micro mb-3">Event log</div>
            <div className="max-h-[300px] overflow-y-auto font-mono text-[12px] leading-[22px]">
              {run.events.slice(0, cursor).map((e, i) => (
                <div
                  key={i}
                  className={`flex gap-3 px-2 py-0.5 ${
                    i === cursor - 1 && playing ? "bg-violet-500/15 rounded-sm" : ""
                  }`}
                >
                  <span className="tnum text-lo/60">{fmtTime(e.ts)}</span>
                  <span className="text-peri-300">{e.step}</span>
                  <span className={STATUS_TEXT[e.status]}>{e.status}</span>
                  {e.note && <span className="text-lo">— {e.note}</span>}
                </div>
              ))}
              {cursor < run.events.length && (
                <div className="px-2 py-0.5 text-lo/50">
                  … {run.events.length - cursor} event{run.events.length - cursor > 1 ? "s" : ""} pending
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </RevealItem>
    </Reveal>
  );
}
