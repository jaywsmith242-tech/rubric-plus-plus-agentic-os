import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { linksData } from "@/lib/data";
import type { Link as LinkItem } from "@/types/data";

/** Links — quiet headers, glass rows, favicon-letter glyphs. Low cinema, high function. */

const CATEGORY_ORDER = ["agent", "community", "content", "micro-app", "infra"];

function LinkTile({ l }: { l: LinkItem }) {
  const internal = l.url.startsWith("#");
  const glyph = (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500/30 to-peri-400/15 font-display text-[13px] font-semibold text-lav-200">
      {l.label.charAt(0)}
    </span>
  );
  const body = (
    <>
      {glyph}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] text-hi">{l.label}</span>
        <span className="block truncate text-[12px] text-lo">{l.note}</span>
      </span>
      <ArrowUpRight size={13} className="shrink-0 text-lo/50 transition-colors duration-hover group-hover:text-peri-400" aria-hidden />
    </>
  );
  const cls = "glass glass-sm lift group flex items-center gap-3 px-3.5 py-2.5";
  if (internal) {
    const to = `/${l.url.slice(1)}`;
    return <Link to={to} className={cls}>{body}</Link>;
  }
  return (
    <a href={l.url} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  );
}

export default function Links() {
  const groups = useMemo(() => {
    const by = new Map<string, LinkItem[]>();
    for (const l of linksData.links) {
      const arr = by.get(l.category) ?? [];
      arr.push(l);
      by.set(l.category, arr);
    }
    const ordered = CATEGORY_ORDER.filter((c) => by.has(c)).map((c) => ({ cat: c, items: by.get(c)! }));
    for (const [cat, items] of by) {
      if (!CATEGORY_ORDER.includes(cat)) ordered.push({ cat, items });
    }
    return ordered;
  }, []);

  return (
    <div className="pt-10">
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">Quick links</h1>
        <p className="mt-1 text-[15px] text-lo">The tools and resources your agents reach for.</p>
      </header>

      <div className="max-w-[860px] space-y-8">
        {groups.map((g) => (
          <section key={g.cat}>
            <h2 className="micro mb-3">{g.cat}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {g.items.map((l) => (
                <LinkTile key={l.label} l={l} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
