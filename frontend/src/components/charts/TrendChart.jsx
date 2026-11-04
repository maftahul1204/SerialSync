import { buildSeriesGeometry } from '@/lib/format';

const FLAG_COLOR = { normal: '#10b981', low: '#f59e0b', high: '#f59e0b', critical: '#ef4444' };

/** Lightweight SVG line chart for one diagnostic test over time (FR-27). */
export default function TrendChart({ series }) {
  const width = 320;
  const height = 120;
  const { coords, yFor } = buildSeriesGeometry(series.points, {
    width,
    height,
    refLow: series.refLow,
    refHigh: series.refHigh,
  });
  const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const last = series.points[series.points.length - 1];
  const hasBand = Number.isFinite(series.refLow) && Number.isFinite(series.refHigh);

  return (
    <figure className="ss-card p-4">
      <figcaption className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ss-text">{series.name}</p>
          <p className="text-xs text-ss-muted">
            {series.code}
            {hasBand ? ` · normal ${series.refLow}-${series.refHigh} ${series.unit}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-ss-text">
            {last.value} <span className="text-xs font-medium text-ss-muted">{series.unit}</span>
          </p>
          <p className="text-xs font-semibold capitalize" style={{ color: FLAG_COLOR[last.flag] }}>
            {last.flag}
          </p>
        </div>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-32 w-full"
        role="img"
        aria-label={`${series.name} history, latest ${last.value} ${series.unit}`}
      >
        {hasBand ? (
          <rect
            x="0"
            y={yFor(series.refHigh)}
            width={width}
            height={Math.max(2, yFor(series.refLow) - yFor(series.refHigh))}
            fill="#10b981"
            opacity="0.1"
          />
        ) : null}
        {coords.length > 1 ? <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" /> : null}
        {coords.map((c) => (
          <circle key={`${c.orderId}-${c.date}`} cx={c.x} cy={c.y} r="4" fill={FLAG_COLOR[c.flag]} stroke="#0f172a" strokeWidth="2">
            <title>{`${c.date}: ${c.value} ${series.unit} (${c.flag})`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-ss-muted">
        <span>{series.points[0].date}</span>
        <span>{last.date}</span>
      </div>
    </figure>
  );
}
