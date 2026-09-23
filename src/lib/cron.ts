/** Minimal 5-field cron engine: `*`, `* /n`, `a-b`, comma lists.
 *  Next-fire by minute-stepping (cap 527,040 min ≈ 1 year), matching the
 *  validated client contract from the first pass. */

interface CronSpec {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
}

function parseField(field: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? parseInt(stepMatch[2], 10) : 1;
    const base = stepMatch ? stepMatch[1] : part;
    let lo = min;
    let hi = max;
    if (base !== "*") {
      const range = base.match(/^(\d+)-(\d+)$/);
      if (range) {
        lo = parseInt(range[1], 10);
        hi = parseInt(range[2], 10);
      } else {
        lo = hi = parseInt(base, 10);
      }
    }
    for (let v = lo; v <= hi; v += step) {
      if (v >= min && v <= max) out.add(v);
    }
  }
  return out;
}

export function parseCron(expr: string): CronSpec | null {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return null;
  try {
    return {
      minute: parseField(f[0], 0, 59),
      hour: parseField(f[1], 0, 23),
      dom: parseField(f[2], 1, 31),
      month: parseField(f[3], 1, 12),
      dow: parseField(f[4], 0, 6),
    };
  } catch {
    return null;
  }
}

function matches(spec: CronSpec, d: Date): boolean {
  return (
    spec.minute.has(d.getMinutes()) &&
    spec.hour.has(d.getHours()) &&
    spec.dom.has(d.getDate()) &&
    spec.month.has(d.getMonth() + 1) &&
    spec.dow.has(d.getDay())
  );
}

/** Next fire time after `from`, or null if none within a year. */
export function nextFire(expr: string, from: Date = new Date()): Date | null {
  const spec = parseCron(expr);
  if (!spec) return null;
  const d = new Date(from.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  for (let i = 0; i < 527040; i++) {
    if (matches(spec, d)) return new Date(d.getTime());
    d.setMinutes(d.getMinutes() + 1);
  }
  return null;
}

export interface Firing {
  expr: string;
  date: Date;
}

/** All firings within [start, start+days), for the week star chart. Max 20/day guard per expr. */
export function firingsInRange(expr: string, start: Date, days: number): Firing[] {
  const spec = parseCron(expr);
  if (!spec) return [];
  const out: Firing[] = [];
  const end = new Date(start.getTime() + days * 86400000);
  const d = new Date(start.getTime());
  d.setSeconds(0, 0);
  const perDay = new Map<string, number>();
  while (d < end && out.length < 400) {
    if (matches(spec, d)) {
      const key = d.toDateString();
      const n = perDay.get(key) ?? 0;
      if (n >= 20) {
        // skip rest of this day
        d.setHours(24, 0, 0, 0);
        continue;
      }
      perDay.set(key, n + 1);
      out.push({ expr, date: new Date(d.getTime()) });
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}
