import { useMemo, useState } from "react";
import { ArrowDown, Zap } from "lucide-react";
import { skillsData } from "@/lib/data";
import type { Skill, SkillLevel } from "@/types/data";
import { Reveal, RevealItem } from "@/components/Reveal";

/** Skill Tree — the ARMS L1→L3 ladder is the default view.
 *  Three tier bands ascending: L1 thin SKILL.md → L2 folder + refs → L3
 *  headless-triggerable. Click a skill for the detail card. */

const LEVEL_META: Record<SkillLevel, { title: string; desc: string }> = {
  1: { title: "Level 1 — Thin skill", desc: "A single SKILL.md. Works, but thin context." },
  2: { title: "Level 2 — Folder + refs", desc: "Reference files alongside the skill." },
  3: { title: "Level 3 — Headless", desc: "Triggerable without a human in the loop." },
};

function SkillChip({ s, selected, onClick }: { s: Skill; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`glass glass-sm lift press flex items-center gap-2.5 px-3.5 py-2 text-left ${
        selected ? "border-violet-500/50 bg-raise-700/60" : ""
      }`}
    >
      {/* chip-orb: tiny luminous dot, size grows with maturity */}
      <span
        className="shrink-0 rounded-full bg-gradient-to-br from-peri-400 to-violet-500"
        style={{
          width: 6 + s.level * 3,
          height: 6 + s.level * 3,
          boxShadow: `0 0 ${4 + s.level * 4}px rgb(var(--peri-400) / ${0.25 + s.level * 0.15})`,
        }}
        aria-hidden
      />
      <span className="font-mono text-[13px] text-hi">{s.name}</span>
      <span className="tnum rounded-sm bg-hi/[.06] px-1.5 py-px text-[10px] text-lo">L{s.level}</span>
    </button>
  );
}

export default function Skills() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [videoOk, setVideoOk] = useState(true);
  const selected = skillsData.skills.find((s) => s.id === selectedId) ?? null;

  const tiers = useMemo(() => {
    const by: Record<SkillLevel, Skill[]> = { 1: [], 2: [], 3: [] };
    for (const s of skillsData.skills) by[s.level].push(s);
    return by;
  }, []);

  return (
    <Reveal className="pt-10">
      <RevealItem>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-[36px] font-semibold leading-[44px]">Skill tree</h1>
          <p className="mt-1 max-w-[52ch] text-[15px] text-lo">
            ARMS maturity ladder — every capability the agents have, ascending L1 → L3.
          </p>
        </div>

        {/* vortex ambience — hides cleanly if the clip is absent */}
        {videoOk && (
          <figure className="shrink-0">
            <div
              className="relative h-[300px] w-[300px] overflow-hidden rounded-[24px]"
              style={{
                WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 52%, transparent 76%)",
                maskImage: "radial-gradient(circle at 50% 50%, black 52%, transparent 76%)",
              }}
            >
              <video
                className="h-full w-full object-cover opacity-55"
                style={{ animation: "shimmer-scale 4.8s ease-in-out infinite" }}
                autoPlay muted loop playsInline
                src="media/orb-hero.mp4"
                onError={() => setVideoOk(false)}
                aria-hidden
              />
            </div>
            <figcaption className="micro mt-2 text-center" style={{ fontSize: 10 }}>
              The ladder — skills ascend L1→L3
            </figcaption>
          </figure>
        )}
      </header>
      </RevealItem>

      <RevealItem>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* ladder: L3 at top so skills visually ascend */}
        <div className="space-y-4">
          {([3, 2, 1] as SkillLevel[]).map((lvl, i) => (
            <div key={lvl}>
              {i > 0 && (
                <div className="flex justify-center py-1 text-lo/40" aria-hidden>
                  <ArrowDown size={14} className="rotate-180" />
                </div>
              )}
              <div className="glass glass-lg p-5">
                <div className="mb-1 flex items-baseline justify-between">
                  <h2 className="font-display text-[15px] font-medium text-lav-200">{LEVEL_META[lvl].title}</h2>
                  <span className="micro">{tiers[lvl].length} skill{tiers[lvl].length === 1 ? "" : "s"}</span>
                </div>
                <p className="mb-4 text-[12px] text-lo">{LEVEL_META[lvl].desc}</p>
                <div className="flex flex-wrap gap-2.5">
                  {tiers[lvl].map((s) => (
                    <SkillChip
                      key={s.id}
                      s={s}
                      selected={s.id === selectedId}
                      onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                    />
                  ))}
                  {tiers[lvl].length === 0 && (
                    <span className="text-[12px] text-lo/50">nothing here yet — promote a skill upward</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* detail card */}
        <aside className="xl:sticky xl:top-20 xl:self-start">
          {selected ? (
            <div className="glass glass-lg p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[17px] text-hi">{selected.name}</h3>
                <span className="rounded-sm border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-lav-200">
                  L{selected.level}
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-[22px] text-hi/85">{selected.description}</p>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="micro mb-1.5">Path</div>
                  <div className="font-mono text-[12px] text-peri-300">{selected.path}</div>
                </div>
                {selected.refs.length > 0 && (
                  <div>
                    <div className="micro mb-1.5">Refs</div>
                    <ul className="space-y-1">
                      {selected.refs.map((r) => (
                        <li key={r} className="font-mono text-[12px] text-lo">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="micro mb-1.5">Triggers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.triggers.map((t) => (
                      <span key={t} className="flex items-center gap-1.5 rounded-sm border border-hi/[.07] bg-raise-800/60 px-2 py-0.5 text-[11px] text-lo">
                        <Zap size={10} className="text-violet-400" aria-hidden />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass glass-lg p-6 text-[13px] leading-[22px] text-lo">
              Select a skill to inspect its path, refs and triggers. Levels are ARMS maturity:
              L1 thin file → L2 folder with references → L3 headless-triggerable.
            </div>
          )}
        </aside>
      </div>
      </RevealItem>
    </Reveal>
  );
}
