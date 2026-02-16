type ModeCardProps = {
  icon: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
};

export default function ModeCard({ icon, title, subtitle, selected, onSelect }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`choice-card focus-ring w-full rounded-2xl p-5 text-start shadow-sm sm:p-6 ${
        selected ? "choice-card-selected" : ""
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-strong)]">{title}</h2>
          <p className="app-muted mt-1 text-sm">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
