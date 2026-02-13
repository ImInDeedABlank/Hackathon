type ProgressBarProps = {
  current: number;
  total: number;
  label?: string;
};

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const rawPercentage = Math.max(0, Math.min(100, (current / safeTotal) * 100));
  const percentage = Math.round(rawPercentage);

  return (
    <div className="w-full space-y-2">
      <div className="theme-muted flex items-center justify-between text-xs font-medium">
        <span>{label ?? "Progress"}</span>
        <span>{percentage}%</span>
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
          className="relative h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-[width] duration-500 ease-out"
          style={{ width: `${rawPercentage}%` }}
        >
          <div className="absolute inset-0 rounded-full opacity-80">
            <div className="h-full w-1/2 bg-white/35 motion-safe:animate-[progress-flow_2.2s_linear_infinite]" />
          </div>
          <div className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/3 rounded-full border border-white/80 bg-white shadow-[0_0_0_4px_rgba(37,99,235,0.22)]" />
        </div>
      </div>
    </div>
  );
}
