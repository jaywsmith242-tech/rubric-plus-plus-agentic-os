import { CheckCircle2, Eye } from "lucide-react";
import { Orb } from "@/components/Orb";
import { sprints, agentById } from "@/lib/data";
import type { SprintTask } from "@/types/data";
import { Reveal, RevealItem } from "@/components/Reveal";

/** Inline orb-chip for `` `(devo)` `` owners. */
function OwnerChip({ owner }: { owner: string }) {
  const a = agentById.get(owner);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-hi/[.08] bg-raise-800/60 py-0.5 pl-1 pr-2 text-[11px] text-lo">
      <Orb size={14} state={a ? (a.status === "offline" ? "offline" : "idle") : "offline"} seedKey={owner} />
      {owner}
    </span>
  );
}

function TaskCard({ t, quiet }: { t: SprintTask; quiet?: boolean }) {
  const humanReview = /human|review|vet\b/i.test(t.text) && !t.done;
  return (
    <div className={`glass glass-sm lift p-3.5 ${quiet ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-2.5">
        {quiet ? (
          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-peri-400" aria-label="done" />
        ) : (
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 shadow-[0_0_6px_rgb(var(--violet-400)/.7)]" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-[20px] text-hi/90">{t.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {t.owner && <OwnerChip owner={t.owner} />}
            {humanReview && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-ember-400/30 bg-ember-400/10 px-1.5 py-px text-[10px] font-medium text-ember-400">
                <Eye size={10} aria-hidden /> human review
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sprints() {
  return (
    <Reveal className="pt-10">
      <RevealItem>
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">{sprints.title}</h1>
        <p className="mt-1 max-w-[72ch] text-[14px] leading-[22px] text-lo">
          Plan the week — agents pull from Backlog top-down. Never delete a task; strike it through if cancelled.
        </p>
      </header>
      </RevealItem>

      <RevealItem>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="font-display text-[15px] font-medium text-lav-200">In Progress</h2>
            <span className="tnum text-[11px] text-lo">{sprints.inProgress.length}</span>
          </div>
          <div className="space-y-2.5">
            {sprints.inProgress.map((t, i) => <TaskCard key={i} t={t} />)}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="font-display text-[15px] font-medium text-hi/80">Backlog</h2>
            <span className="tnum text-[11px] text-lo">{sprints.backlog.length}</span>
          </div>
          <div className="space-y-2.5">
            {sprints.backlog.map((t, i) => <TaskCard key={i} t={t} />)}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="font-display text-[15px] font-medium text-lo">Done</h2>
            <span className="tnum text-[11px] text-lo">{sprints.done.length}</span>
          </div>
          <div className="space-y-2.5">
            {sprints.done.map((t, i) => <TaskCard key={i} t={t} quiet />)}
          </div>
        </section>
      </div>
      </RevealItem>
    </Reveal>
  );
}
