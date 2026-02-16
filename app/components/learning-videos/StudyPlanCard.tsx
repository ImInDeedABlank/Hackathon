import SectionHeader from "@/app/components/ui/SectionHeader";

type StudyPlanCardProps = {
  weeklyPlanHint: string;
  steps: string[];
};

export default function StudyPlanCard({ weeklyPlanHint, steps }: StudyPlanCardProps) {
  return (
    <section className="app-section">
      <SectionHeader
        as="h2"
        kicker="Weekly Plan"
        title="Study Path"
        description={weeklyPlanHint}
      />
      <ol className="app-body app-muted mt-4 space-y-2 text-sm">
        {steps.map((step, index) => (
          <li key={step} className="app-section-soft px-3 py-2">
            <span className="font-semibold text-[color:var(--text-strong)]">{index + 1}. </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
