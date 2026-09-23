import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { FileText } from "lucide-react";
import { docs } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";

/** Docs — the same files your agents load as context. */
export default function Docs() {
  const { slug } = useParams();
  const current = docs.find((d) => d.slug === slug) ?? docs[0];
  const html = useMemo(() => renderMarkdown(current.body), [current]);

  return (
    <div className="pt-10">
      <header className="mb-10">
        <h1 className="font-display text-[36px] font-semibold leading-[44px]">Docs</h1>
        <p className="mt-1 text-[15px] text-lo">The same files your agents load as context.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-1.5 lg:sticky lg:top-20 lg:self-start">
          {docs.map((d) => (
            <Link
              key={d.slug}
              to={`/docs/${d.slug}`}
              className={`glass glass-sm lift flex items-center gap-2.5 px-3.5 py-2.5 text-[14px] ${
                d.slug === current.slug ? "border-violet-500/40 bg-raise-700/50 text-lav-200" : "text-lo hover:text-hi"
              }`}
            >
              <FileText size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{d.title}</span>
            </Link>
          ))}
          <div className="px-1 pt-3 text-[11px] leading-[16px] text-lo/60">
            data/docs/*.md — read-only here; agents and humans edit the files.
          </div>
        </aside>

        <article className="glass glass-lg p-8 lg:p-10">
          <div className="doc-body max-w-[72ch]" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </div>
  );
}
