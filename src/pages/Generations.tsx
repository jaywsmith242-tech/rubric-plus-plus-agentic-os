import { useState } from "react";
import { Clapperboard, Image as ImageIcon, Play } from "lucide-react";
import { generationsData } from "@/lib/data";
import { lcg } from "@/lib/rng";
import { relTime } from "@/lib/time";
import { useNow } from "@/hooks/useNow";
import type { Generation } from "@/types/data";

/** Seed-derived nebula placeholder — violet family ONLY (hue 230–260°),
 *  never random-hue confetti. Two layered radial blooms + veil. */
function SeedArt({ seed, height }: { seed: number; height: number }) {
  const rnd = lcg(seed);
  const blobs = Array.from({ length: 3 }, () => ({
    x: 15 + rnd() * 70,
    y: 15 + rnd() * 70,
    h: 230 + rnd() * 30, // analogous violet field
    s: 55 + rnd() * 25,
    l: 45 + rnd() * 25,
    o: 0.35 + rnd() * 0.3,
  }));
  const bg = blobs
    .map(
      (b) =>
        `radial-gradient(60% 55% at ${b.x.toFixed(1)}% ${b.y.toFixed(1)}%, hsla(${b.h.toFixed(0)},${b.s.toFixed(0)}%,${b.l.toFixed(0)}%,${b.o.toFixed(2)}), transparent 70%)`
    )
    .join(",");
  return (
    <div
      className="w-full"
      style={{
        height,
        background: `${bg}, linear-gradient(160deg, #151129, #07071A)`,
      }}
      aria-hidden
    />
  );
}

function GenCard({ g, now }: { g: Generation; now: number }) {
  const [assetOk, setAssetOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const heights = [190, 230, 260, 210];
  const h = heights[g.seed % heights.length];

  return (
    <div className="glass lift mb-4 break-inside-avoid overflow-hidden">
      <div className="relative">
        <SeedArt seed={g.seed} height={h} />
        {/* real asset layered on top when it actually loads; hidden if absent */}
        {assetOk && (
          <img
            src={g.asset}
            alt={g.prompt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setAssetOk(false)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-state ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {g.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="glass flex h-10 w-10 items-center justify-center rounded-full">
              <Play size={15} className="ml-0.5 text-core-050" aria-hidden />
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-sm border border-hi/[.1] bg-void-950/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-lav-200 backdrop-blur-sm">
          {g.type}
        </span>
      </div>
      <div className="p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-peri-300">{g.id}</span>
          <span className="tnum text-[11px] text-lo/60">{relTime(g.ts, now)}</span>
        </div>
        <p className="text-[13px] leading-[20px] text-hi/85">{g.prompt}</p>
        <div className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-lo">
          {g.type === "video" ? <Clapperboard size={11} aria-hidden /> : <ImageIcon size={11} aria-hidden />}
          <span className="truncate">{g.model} · {g.skill} · seed {g.seed}</span>
        </div>
      </div>
    </div>
  );
}

export default function Generations() {
  const now = useNow(30000);
  const newestFirst = [...generationsData.generations].reverse();

  return (
    <div className="pt-10">
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">Generations log</h1>
        <p className="mt-1 text-[15px] text-lo">
          Every image and video the agents shipped — prompt, model, skill, seed.
        </p>
      </header>
      <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
        {newestFirst.map((g) => (
          <GenCard key={g.id} g={g} now={now} />
        ))}
      </div>
    </div>
  );
}
