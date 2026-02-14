type ScenarioCardProps = {
  name: string;
  icon: string;
  difficulty: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
};

export default function ScenarioCard({
  name,
  icon,
  difficulty,
  description = "Practice this real-life scenario.",
  selected,
  onSelect,
}: ScenarioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`scenario-card group w-full rounded-3xl p-5 text-left motion-safe:animate-[card-enter_500ms_ease-out_both] ${
        selected ? "scenario-card-selected" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 text-xl shadow-sm backdrop-blur">
          <span aria-hidden="true">{icon}</span>
        </span>
        <span className="theme-panel-soft rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
          {difficulty}
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{name}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 text-slate-700 transition-transform duration-200 group-hover:translate-x-0.5">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </button>
  );
}
