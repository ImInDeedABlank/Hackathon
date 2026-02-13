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
      className={`choice-card w-full rounded-2xl p-5 text-left shadow-sm transition sm:p-6 ${
        selected ? "choice-card-selected" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
