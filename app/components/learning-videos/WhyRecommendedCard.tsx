type WhyRecommendedCardProps = {
  summary: string;
  pacingAdvice: string;
  strengths: [string, string, string];
  weaknesses: [string, string, string];
};

export default function WhyRecommendedCard({
  summary,
  pacingAdvice,
  strengths,
  weaknesses,
}: WhyRecommendedCardProps) {
  return (
    <section className="theme-panel rounded-2xl p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Why These Videos</h2>
      <p className="mt-3 text-sm text-slate-700">{summary}</p>
      <p className="mt-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Pacing advice:</span> {pacingAdvice}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Strengths</p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Weaknesses</p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
            {weaknesses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

