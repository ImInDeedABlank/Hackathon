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
      className={`w-full rounded-2xl border p-5 text-left shadow-sm transition ${
        selected
          ? "border-indigo-500 bg-indigo-50"
          : "border-white/70 bg-white/80 hover:border-indigo-300"
      }`}
    >
      <p className="text-base font-semibold text-slate-900">{name}</p>
      <p className="mt-1 text-sm text-slate-600">Practice this real-life scenario.</p>
    </button>
  );
}
