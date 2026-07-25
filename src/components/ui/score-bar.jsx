// Thin sequential-hue bar with a direct value label, per single-series
// magnitude conventions: one hue light->dark, rounded ends, no legend needed.
export function ScoreBar({ label, value, max = 100, formatValue, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono text-slate-700">{formatValue ? formatValue(value) : value}</span>
      </div>
      <div className="h-2 rounded-full bg-brand-tealLight overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-teal to-brand-blue"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
