type ProgressBarProps = {
  current: number;
  total: number;
  label?: string;
};

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.max(0, Math.min(100, Math.round((current / safeTotal) * 100)));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label ?? "Progress"}</span>
        <span>{percentage}%</span>
      </div>
      <div
        aria-label={label ?? "Progress"}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        role="progressbar"
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
