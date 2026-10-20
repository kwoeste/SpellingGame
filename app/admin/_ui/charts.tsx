type Point = { x: string; y: number | null };

const W = 360;
const H = 140;
const PAD = { l: 28, r: 8, t: 10, b: 24 };

function scaleX(i: number, n: number): number {
  if (n <= 1) return PAD.l;
  return PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
}

function scaleY(value: number, min: number, max: number): number {
  const span = max - min || 1;
  return H - PAD.b - ((value - min) / span) * (H - PAD.t - PAD.b);
}

export function LineChart(props: {
  title: string;
  points: Point[];
  yMin?: number;
  yMax?: number;
  band?: { low: number; high: number };
  caption?: string;
}) {
  const values = props.points.map((p) => p.y).filter((y): y is number => y !== null);
  const min = props.yMin ?? (values.length ? Math.min(0, ...values) : 0);
  const max = props.yMax ?? (values.length ? Math.max(...values, 1) : 1);
  const coords = props.points
    .map((p, i) => (p.y === null ? null : `${scaleX(i, props.points.length).toFixed(1)},${scaleY(p.y, min, max).toFixed(1)}`))
    .filter((part): part is string => part !== null);
  const band = props.band;
  return (
    <div className="pd-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={props.title}>
        <title>{props.title}</title>
        {band ? (
          <rect
            x={PAD.l}
            y={scaleY(band.high, min, max)}
            width={W - PAD.l - PAD.r}
            height={Math.max(0, scaleY(band.low, min, max) - scaleY(band.high, min, max))}
            fill="var(--pd-band)"
            opacity="0.55"
          />
        ) : null}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--pd-line)" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--pd-line)" />
        {coords.length > 1 ? (
          <polyline fill="none" stroke="var(--pd-accent)" strokeWidth="2" points={coords.join(" ")} />
        ) : null}
        {props.points.map((p, i) =>
          p.y === null ? null : (
            <circle key={p.x} cx={scaleX(i, props.points.length)} cy={scaleY(p.y, min, max)} r="2.5" fill="var(--pd-accent)" />
          ),
        )}
        <text x={PAD.l} y={H - 6} fontSize="9" fill="var(--pd-soft)">
          {props.points[0]?.x ?? ""}
        </text>
        <text x={W - PAD.r} y={H - 6} fontSize="9" fill="var(--pd-soft)" textAnchor="end">
          {props.points.at(-1)?.x ?? ""}
        </text>
      </svg>
      {props.caption ? <p className="pd-chart-caption">{props.caption}</p> : null}
    </div>
  );
}

export function BarChart(props: { title: string; points: Point[]; caption?: string }) {
  const values = props.points.map((p) => p.y ?? 0);
  const max = Math.max(1, ...values);
  const slot = (W - PAD.l - PAD.r) / Math.max(1, props.points.length);
  return (
    <div className="pd-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={props.title}>
        <title>{props.title}</title>
        {props.points.map((p, i) => {
          const h = ((p.y ?? 0) / max) * (H - PAD.t - PAD.b);
          return (
            <rect
              key={p.x}
              x={PAD.l + i * slot + 2}
              y={H - PAD.b - h}
              width={Math.max(2, slot - 4)}
              height={h}
              fill="var(--pd-accent-2)"
              rx="2"
            />
          );
        })}
      </svg>
      {props.caption ? <p className="pd-chart-caption">{props.caption}</p> : null}
    </div>
  );
}

export function GoalRing(props: { label: string; pct: number; done: number; goal: number; unit: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const isNoData = props.pct < 0;
  const dash = isNoData ? 0 : Math.max(0, Math.min(100, props.pct)) / 100 * c;
  return (
    <div className="pd-ring">
      <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label={`${props.label} ${isNoData ? "none" : `${props.pct}%`}`}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--pd-line)" strokeWidth="8" />
        {!isNoData && (
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="var(--pd-accent)"
            strokeWidth="8"
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        )}
        <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--pd-ink)">
          {isNoData ? "—" : `${props.pct}%`}
        </text>
      </svg>
      <strong>{props.label}</strong>
      <span>
        {isNoData ? "Nothing due" : `${props.done} / ${props.goal} ${props.unit}`}
      </span>
    </div>
  );
}

export function HorizontalBars(props: { rows: { label: string; pct: number }[] }) {
  return (
    <div>
      {props.rows.map((row) => (
        <div className="pd-bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="pd-bar-track">
            <div className="pd-bar-fill" style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
          </div>
          <span>{row.pct}%</span>
        </div>
      ))}
    </div>
  );
}
