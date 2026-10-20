export function ProgressRing({
  pct,
  label,
  size = 88,
}: {
  pct: number;
  label: string;
  size?: number;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (safe / 100) * c;
  return (
    <div style={{ width: size, textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${label} ${safe} percent`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3d7b3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e85d04"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="54%" textAnchor="middle" fontSize={size * 0.22} fontWeight={800} fill="#1b2437">
          {safe}%
        </text>
      </svg>
      <div style={{ fontWeight: 800, marginTop: 4 }}>{label}</div>
    </div>
  );
}
