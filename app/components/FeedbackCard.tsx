import type { ChatResponseShape } from "@/lib/validate";

type FeedbackCardProps = {
  feedback: ChatResponseShape["feedback"];
  score: number;
};

export default function FeedbackCard({ feedback, score }: FeedbackCardProps) {
  return (
    <section className="feedback-card rounded-2xl p-4 sm:p-5">
      <h3 className="feedback-card-title text-sm font-semibold uppercase tracking-wide">Feedback</h3>
      <div className="feedback-card-body mt-3 space-y-2 text-sm">
        <p>
          <span className="feedback-card-label font-semibold">Corrected version:</span> {feedback.corrected_version}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Grammar note:</span> {feedback.grammar_note}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Key mistakes:</span> {feedback.key_mistakes.join(" | ")}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Natural alternatives:</span>{" "}
          {feedback.natural_alternatives.join(" | ")}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">Score:</span> {score}/10
        </p>
      </div>
    </section>
  );
}
