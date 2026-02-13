type ScenarioCardProps = {
  name: string;
  selected: boolean;
  onSelect: () => void;
};

export default function ScenarioCard({ name, selected, onSelect }: ScenarioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`choice-card w-full rounded-2xl p-5 text-left shadow-sm transition ${
        selected ? "choice-card-selected" : ""
      }`}
    >
      <p className="text-base font-semibold text-slate-900">{name}</p>
      <p className="mt-1 text-sm text-slate-600">Practice this real-life scenario.</p>
    </button>
  );
}
