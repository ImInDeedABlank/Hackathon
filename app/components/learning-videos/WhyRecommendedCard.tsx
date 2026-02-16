import SectionHeader from "@/app/components/ui/SectionHeader";

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
    <section className="app-section">
      <SectionHeader
        as="h2"
        kicker="Learning Fit"
        title="Why These Videos"
        description={summary}
      />
      <p className="app-body app-muted mt-2 text-sm">
        <span className="font-semibold text-[color:var(--text-strong)]">Pacing advice:</span> {pacingAdvice}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="app-caption text-xs font-semibold uppercase tracking-[0.12em]">Strengths</p>
          <ul className="app-body app-muted mt-2 list-disc space-y-1 ps-5 text-sm">
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="app-caption text-xs font-semibold uppercase tracking-[0.12em]">Weaknesses</p>
          <ul className="app-body app-muted mt-2 list-disc space-y-1 ps-5 text-sm">
            {weaknesses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
