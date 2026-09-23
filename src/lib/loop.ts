/** One shared requestAnimationFrame loop for every animated surface
 *  (nebula, orbs, swarm field, count-ups). Keeps the page at a single rAF
 *  loop regardless of instance count; pauses when document.hidden. */

type DrawFn = (timeMs: number) => void;

const fns = new Set<DrawFn>();
let raf = 0;
let running = false;

function tick(t: number) {
  fns.forEach((f) => f(t));
  raf = requestAnimationFrame(tick);
}

function ensure() {
  if (!running && fns.size > 0 && !document.hidden) {
    running = true;
    raf = requestAnimationFrame(tick);
  }
}

function halt() {
  running = false;
  cancelAnimationFrame(raf);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) halt();
    else ensure();
  });
}

/** Register a draw callback; returns an unregister function. */
export function registerDraw(fn: DrawFn): () => void {
  fns.add(fn);
  ensure();
  return () => {
    fns.delete(fn);
    if (fns.size === 0) halt();
  };
}
