type ProgressBarProps = {
  current: number;
  total: number;
  label?: string;
};

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const rawPercentage = Math.max(0, Math.min(100, (current / safeTotal) * 100));
  const percentage = Math.round(rawPercentage);
  const showTip = rawPercentage > 0;

  return (
    <div className="w-full space-y-2">
      <div className="app-muted flex items-center justify-between text-xs font-medium">
        <span>{label ?? "Progress"}</span>
        <span className="font-semibold text-[color:var(--text-strong)]">{percentage}%</span>
      </div>
      <div
        aria-label={label ?? "Progress"}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        role="progressbar"
        className="theme-progress-track relative h-3 w-full overflow-hidden rounded-full"
      >
        <div
          className="relative h-full rounded-full bg-[linear-gradient(90deg,var(--button-start)_0%,color-mix(in_srgb,var(--accent)_68%,white_4%)_55%,var(--button-end)_100%)] transition-[width] duration-500 ease-out"
          style={{ width: `${rawPercentage}%` }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-white/25 via-white/5 to-white/20" />
          {showTip ? (
            <div className="absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white/80 bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.22)]" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
