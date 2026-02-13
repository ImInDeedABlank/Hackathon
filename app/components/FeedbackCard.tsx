export type MockFeedback = {
  corrections: string;
  grammarNote: string;
  naturalPhrasing: string;
  score: number;
};

type FeedbackCardProps = {
  feedback: MockFeedback;
};

export default function FeedbackCard({ feedback }: FeedbackCardProps) {
  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Feedback</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">Corrections:</span> {feedback.corrections}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Grammar note:</span> {feedback.grammarNote}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Natural phrasing:</span> {feedback.naturalPhrasing}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Score:</span> {feedback.score}/10
        </p>
      </div>
    </section>
  );
}
