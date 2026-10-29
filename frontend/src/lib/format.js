/** Small display helpers shared by screens (kept framework-free so they are unit-testable). */

export function timeAgo(value, now = Date.now()) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(t).toLocaleDateString();
}

export function todayYmd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTaka(amount) {
  return `৳${Number(amount || 0).toLocaleString('en-US')}`;
}

/** Build SVG chart geometry for a value series. Returns point coordinates inside width x height. */
export function buildSeriesGeometry(points, { width = 320, height = 120, pad = 14, refLow, refHigh } = {}) {
  if (!points.length) return { coords: [], min: 0, max: 0, yFor: () => height / 2 };
  const values = points.map((p) => p.value);
  let min = Math.min(...values, refLow ?? Infinity);
  let max = Math.max(...values, refHigh ?? -Infinity);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const yFor = (v) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: points.length > 1 ? pad + step * i : width / 2,
    y: yFor(p.value),
    ...p,
  }));
  return { coords, min, max, yFor };
}
