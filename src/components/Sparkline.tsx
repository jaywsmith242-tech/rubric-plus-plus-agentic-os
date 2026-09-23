/** Tiny SVG sparkline — peri-300 stroke, violet fill fade. No axis, no chrome.
 *  Optional endDot: paints the final point in ember with a three-radius bloom
 *  (core / halo / atmosphere) — reserved for the one actionable tile. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className = "",
  endDot = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  endDot?: boolean;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--violet-500))" stopOpacity=".35" />
          <stop offset="100%" stopColor="rgb(var(--violet-500))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="rgb(var(--peri-300))" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {endDot && (
        <g>
          {/* atmosphere */}
          <circle cx={ex} cy={ey} r="10" fill="rgb(var(--ember-400))" opacity=".12" />
          {/* halo */}
          <circle cx={ex} cy={ey} r="5" fill="rgb(var(--ember-400))" opacity=".3" />
          {/* core */}
          <circle cx={ex} cy={ey} r="2.2" fill="rgb(var(--ember-400))" opacity=".95" />
        </g>
      )}
    </svg>
  );
}
