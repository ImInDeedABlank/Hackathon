type StudyPlanCardProps = {
  weeklyPlanHint: string;
  steps: string[];
};

export default function StudyPlanCard({ weeklyPlanHint, steps }: StudyPlanCardProps) {
  return (
    <section className="theme-panel rounded-2xl p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Study Path</h2>
      <p className="mt-3 text-sm text-slate-700">{weeklyPlanHint}</p>
      <ol className="mt-4 space-y-2 text-sm text-slate-700">
        {steps.map((step, index) => (
          <li key={step} className="theme-panel-soft rounded-xl px-3 py-2">
            <span className="font-semibold text-slate-900">{index + 1}. </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}

