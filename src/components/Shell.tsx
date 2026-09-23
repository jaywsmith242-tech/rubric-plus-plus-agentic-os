import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Server } from "lucide-react";
import { NAV, navForPath } from "@/lib/nav";
import { Orb } from "@/components/Orb";
import { NebulaBackground } from "@/components/NebulaBackground";
import { useNow } from "@/hooks/useNow";
import { fmtClock, relTime } from "@/lib/time";
import { auditEvents } from "@/lib/data";

const BOOT_EASE = [0.23, 1, 0.32, 1] as const;

/** Live audit-log pulse: replays the real events.jsonl stream; each landing
 *  event flashes the orb-dot ember for 600ms, then it settles back to peri. */
function useLivePulse() {
  const [flash, setFlash] = useState(false);
  const [idx, setIdx] = useState(auditEvents.length - 1);
  useEffect(() => {
    if (auditEvents.length === 0) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % auditEvents.length);
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 600);
      return () => window.clearTimeout(t);
    }, 45000);
    return () => window.clearInterval(id);
  }, []);
  return { flash, event: auditEvents[idx] };
}

function LiveDot({ flash }: { flash: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full rounded-full ${
          flash ? "bg-ember-400" : "bg-peri-400"
        }`}
        style={{ animation: "pulse-dot 2.8s ease-in-out infinite", opacity: flash ? 1 : 0.55 }}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-state ease-state ${
          flash ? "bg-ember-400" : "bg-peri-400/80"
        }`}
        style={flash ? { animation: "event-flash 600ms ease-out" } : undefined}
      />
    </span>
  );
}

export function Shell() {
  const location = useLocation();
  const now = useNow(1000);
  const { flash, event } = useLivePulse();
  const current = navForPath(location.pathname);

  // Boot sequence plays once per session.
  const booted = useRef(sessionStorage.getItem("rubricpp.booted") === "1");
  const [boot] = useState(!booted.current);
  useEffect(() => {
    sessionStorage.setItem("rubricpp.booted", "1");
  }, []);

  const reveal = (order: number) =>
    boot
      ? {
          initial: { opacity: 0, y: 8, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.9 - order * 0.1, delay: order * 0.135, ease: BOOT_EASE },
        }
      : {};

  const sections = useMemo(() => {
    const order: Array<"Observe" | "Operate" | "Explore"> = ["Observe", "Operate", "Explore"];
    return order.map((s) => ({ name: s, items: NAV.filter((n) => n.section === s) }));
  }, []);

  return (
    <div className="grain min-h-screen text-hi">
      <NebulaBackground />

      {/* ── Left rail — 232px ─────────────────────────────── */}
      <motion.aside
        {...reveal(0)}
        className="fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-hi/[.06] bg-void-900/55 backdrop-blur-[22px]"
      >
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <Orb size={34} state="idle" seedKey="rubric-brand" title="RUBRIC++ orb mark" />
          <div>
            <div className="font-display text-[15px] font-semibold tracking-wide">RUBRIC++</div>
            <div className="micro mt-0.5" style={{ fontSize: 10 }}>Agentic OS</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {sections.map((sec) => (
            <div key={sec.name} className="mt-5 first:mt-0">
              <div className="micro px-2 pb-2">{sec.name}</div>
              <ul className="space-y-0.5">
                {sec.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[14px] transition-colors duration-hover ease-hover ${
                          isActive
                            ? "bg-raise-700 text-lav-200"
                            : "text-lo hover:bg-raise-800/60 hover:text-hi"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-peri-400 shadow-[0_0_8px_rgb(var(--peri-400)/.8)]" />
                          )}
                          <item.icon size={16} strokeWidth={1.8} className="shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{item.label}</span>
                          {typeof item.count === "number" && (
                            <span
                              className={`tnum rounded-sm px-1.5 py-px text-[11px] leading-[14px] ${
                                isActive ? "bg-violet-500/25 text-lav-200" : "bg-hi/[.06] text-lo"
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-hi/[.06] px-5 py-4">
          <div className="text-[12px] leading-[16px] text-lo">files are the database</div>
          <div className="text-[12px] leading-[16px] text-lo/60">agents welcome</div>
        </div>
      </motion.aside>

      {/* ── Top bar ───────────────────────────────────────── */}
      <motion.header
        {...reveal(1)}
        className="fixed left-[232px] right-0 top-0 z-30 flex h-14 items-center gap-4 border-b border-hi/[.06] bg-void-950/45 px-8 backdrop-blur-[22px]"
      >
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-lo">RUBRIC++</span>
          <span className="text-lo/40">/</span>
          <span className="font-medium text-hi">{current.label}</span>
        </div>
        <div className="flex-1" />

        <div
          className="flex items-center gap-2 rounded-sm border border-hi/[.07] bg-raise-800/50 px-2.5 py-1"
          title={event ? `last: ${event.actor} · ${event.action} · ${relTime(event.ts, now)}` : "audit log"}
        >
          <LiveDot flash={flash} />
          <span className={`text-[12px] transition-colors duration-state ${flash ? "text-ember-400" : "text-lo"}`}>
            {flash && event ? `updated ${event.panel}` : "live"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-sm border border-hi/[.07] bg-raise-800/50 px-2.5 py-1 text-[12px] text-lo">
          <Server size={12} aria-hidden />
          <span className="font-mono">hermes (cloud) ⇄ local</span>
        </div>

        <div className="tnum font-display text-[13px] font-medium text-hi/90">{fmtClock(new Date(now))}</div>
      </motion.header>

      {/* ── Content ───────────────────────────────────────── */}
      <motion.main {...reveal(2)} className="relative z-10 ml-[232px] px-8 pb-16 pt-14">
        <div className="mx-auto max-w-shell">
          <AnimatePresence mode="wait">
            {/* page-transition token: 400ms crossfade + 12px drift */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.2, ease: [0.5, 0, 0.75, 0] } }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
    </div>
  );
}
