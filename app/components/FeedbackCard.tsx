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
    <section className="feedback-card rounded-2xl p-4 sm:p-5">
      <h3 className="feedback-card-title text-sm font-semibold uppercase tracking-wide">Feedback</h3>
      <div className="feedback-card-body mt-3 space-y-2 text-sm">
        <p>
          <span className="feedback-card-label font-semibold">Corrections:</span> {feedback.corrections}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Grammar note:</span> {feedback.grammarNote}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Natural phrasing:</span> {feedback.naturalPhrasing}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Score:</span> {feedback.score}/10
        </p>
      </div>
    </section>
  );
}
