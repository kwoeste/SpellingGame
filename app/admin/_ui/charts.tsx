import { formatDayKey } from "@/lib/admin/format";
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
  /** Put before each axis date, e.g. "Week of ". */
  xPrefix?: string;
  /** Formats y values for the axis and point labels. */
  yFormat?: (value: number) => string;
}) {
  const fmt = props.yFormat ?? ((v: number) => String(Math.round(v)));
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
            <g key={p.x}>
              <circle cx={scaleX(i, props.points.length)} cy={scaleY(p.y, min, max)} r="2.5" fill="var(--pd-accent)" />
              <text x={scaleX(i, props.points.length)} y={scaleY(p.y, min, max) - 5} fontSize="9" textAnchor="middle" fill="var(--pd-ink)">
                {fmt(p.y)}
              </text>
            </g>
          ),
        )}
        <text x={PAD.l - 3} y={PAD.t + 4} fontSize="8" textAnchor="end" fill="var(--pd-soft)">{fmt(max)}</text>
        <text x={PAD.l - 3} y={H - PAD.b} fontSize="8" textAnchor="end" fill="var(--pd-soft)">{fmt(min)}</text>
        <text x={PAD.l} y={H - 6} fontSize="9" fill="var(--pd-soft)">
          {props.xPrefix ?? ""}{axisLabel(props.points[0]?.x, Boolean(props.xPrefix))}
        </text>
        {props.points.length > 1 ? (
          <text x={W - PAD.r} y={H - 6} fontSize="9" fill="var(--pd-soft)" textAnchor="end">
            {props.xPrefix ?? ""}{axisLabel(props.points.at(-1)?.x, Boolean(props.xPrefix))}
          </text>
        ) : null}
      </svg>
      {props.caption ? <p className="pd-chart-caption">{props.caption}</p> : null}
    </div>
  );
}

/** Day keys (2026-10-19) read as "Mon, Oct 19"; anything else passes through. */
export function axisLabel(x: string | undefined, dateOnly = false): string {
  if (!x) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;
  const label = formatDayKey(x);
  return dateOnly ? label.replace(/^\w+, /, "") : label;
}

export function BarChart(props: { title: string; points: Point[]; caption?: string; yLabel?: string }) {
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
            >
              <title>{`${axisLabel(p.x)}: ${p.y ?? 0}`}</title>
            </rect>
          );
        })}
        {props.points.map((p, i) =>
          (p.y ?? 0) > 0 && props.points.length <= 14 ? (
            <text key={`v${p.x}`} x={PAD.l + i * slot + slot / 2} y={H - PAD.b - ((p.y ?? 0) / max) * (H - PAD.t - PAD.b) - 2} fontSize="8" textAnchor="middle" fill="var(--pd-ink)">
              {p.y}
            </text>
          ) : null,
        )}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--pd-line)" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--pd-line)" />
        <text x={PAD.l - 3} y={PAD.t + 4} fontSize="8" textAnchor="end" fill="var(--pd-soft)">{max}</text>
        <text x={PAD.l - 3} y={H - PAD.b} fontSize="8" textAnchor="end" fill="var(--pd-soft)">0</text>
        {props.yLabel ? (
          <text x={4} y={PAD.t + 4} fontSize="8" fill="var(--pd-soft)" transform={`rotate(-90 8 ${H / 2})`}>{props.yLabel}</text>
        ) : null}
        <text x={PAD.l} y={H - 6} fontSize="9" fill="var(--pd-soft)">{axisLabel(props.points[0]?.x)}</text>
        {props.points.length > 1 ? (
          <text x={W - PAD.r} y={H - 6} fontSize="9" fill="var(--pd-soft)" textAnchor="end">{axisLabel(props.points.at(-1)?.x)}</text>
        ) : null}
      </svg>
      {props.caption ? <p className="pd-chart-caption">{props.caption}</p> : null}
    </div>
  );
}

export function GoalRing(props: { label: string; pct: number; arcPct?: number; text?: string; done: number; goal: number; unit: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const isNoData = props.pct < 0;
  const arc = props.arcPct ?? Math.min(100, props.pct);
  const dash = isNoData ? 0 : Math.max(0, Math.min(100, arc)) / 100 * c;
  const text = props.text ?? `${props.pct}%`;
  return (
    <div className="pd-ring">
      <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label={`${props.label} ${isNoData ? "none" : text}`}>
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
        <text x="40" y="44" textAnchor="middle" fontSize={text.length > 5 ? "10" : "13"} fontWeight="700" fill="var(--pd-ink)">
          {isNoData ? "—" : text}
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
