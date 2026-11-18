export type MapShape = { id: string; d: string };
export type MapLabel = { x: number; y: number; lines: string[] };
export type MapFrame = { viewBox: string; oceanX: number; compassX: number; compassY: number };

const NEUTRAL = "#f3d7b0";
const NEUTRAL_STROKE = "#c4a574";

function frameSize(viewBox: string): { width: number; height: number } {
  const parts = viewBox.split(/[\s,]+/).map(Number);
  return { width: parts[2] || 460, height: parts[3] || 900 };
}

export function ColoniesMap({
  frame,
  shapes,
  fills,
  strokes,
  labels,
  highlightId,
  selectedId,
  interactive,
  onSelect,
}: {
  frame: MapFrame;
  shapes: MapShape[];
  fills?: Record<string, string>;
  strokes?: Record<string, string>;
  labels?: Record<string, MapLabel>;
  highlightId?: string | null;
  selectedId?: string | null;
  interactive?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { width, height } = frameSize(frame.viewBox);
  return (
    <div className="colonies-map">
      <svg viewBox={frame.viewBox} role="img" aria-label="A simple map of the 13 original colonies. North is up. The ocean is on the right.">
        <rect x="0" y="0" width={width} height={height} fill="#e7f4fb" />
        <rect x="0" y="0" width={frame.oceanX - 30} height={height} fill="#f6efe4" />
        <text x={frame.oceanX + 8} y={height / 2} fill="#1d7fc4" fontSize="15" fontWeight="800" transform={`rotate(90 ${frame.oceanX + 18} ${height / 2})`}>
          Atlantic Ocean
        </text>
        <g transform={`translate(${frame.compassX} ${frame.compassY})`} aria-hidden="true">
          <circle r="26" fill="#fff" stroke="#1b2437" strokeWidth="3" />
          <polygon points="0,-20 5,-4 0,-8 -5,-4" fill="#e85d04" />
          <polygon points="0,20 5,4 0,8 -5,4" fill="#1b2437" />
          <text y="-32" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1b2437">N</text>
          <text y="42" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1b2437">S</text>
          <text x="34" y="5" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1b2437">E</text>
          <text x="-34" y="5" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1b2437">W</text>
        </g>
        {shapes.map((shape) => {
          const lit = highlightId === shape.id;
          const selected = selectedId === shape.id;
          const label = labels?.[shape.id];
          const name = label?.lines.join(" ");
          return (
            <g key={shape.id}>
              <path
                d={shape.d}
                fill={lit ? "#ffd0a8" : fills?.[shape.id] ?? NEUTRAL}
                stroke={lit ? "#e85d04" : selected ? "#1b7f5a" : strokes?.[shape.id] ?? NEUTRAL_STROKE}
                strokeWidth={lit || selected ? 4 : 2}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={name ?? "Colony shape"}
                aria-pressed={interactive ? selected : undefined}
                onClick={interactive ? () => onSelect?.(shape.id) : undefined}
                onKeyDown={interactive ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect?.(shape.id);
                  }
                } : undefined}
                style={{ cursor: interactive ? "pointer" : "default" }}
              />
              {label ? (
                <text x={label.x} y={label.y} textAnchor="middle" fontSize="13" fontWeight="800" fill="#1b2437" stroke="#fff" strokeWidth="4" paintOrder="stroke">
                  {label.lines.map((line, index) => (
                    <tspan key={line} x={label.x} dy={index === 0 ? 0 : 14}>{line}</tspan>
                  ))}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
