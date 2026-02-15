"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { ChatResponseShape } from "@/lib/validate";

type FeedbackCardProps = {
  feedback: ChatResponseShape["feedback"];
  score: number;
};

export default function FeedbackCard({ feedback, score }: FeedbackCardProps) {
  const { t } = useLanguage();

  return (
    <section className="feedback-card rounded-2xl p-4 sm:p-5">
      <h3 className="feedback-card-title text-sm font-semibold uppercase tracking-wide">{t("feedback_title")}</h3>
      <div className="feedback-card-body mt-3 space-y-2 text-sm">
        <p>
          <span className="feedback-card-label font-semibold">{t("your_response_label")}:</span> {feedback.user_original}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">{t("corrected_version_label")}:</span> {feedback.corrected_version}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">{t("grammar_note_label")}:</span> {feedback.grammar_note}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">{t("key_mistakes_label")}:</span> {feedback.key_mistakes.join(" | ")}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">{t("natural_alternatives_label")}:</span>{" "}
          {feedback.natural_alternatives.join(" | ")}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">{t("improvement_tip_label")}:</span> {feedback.improvement_tip}
        </p>
        <p>
          <span className="feedback-card-label font-semibold">{t("score_label")}:</span> {score}/10
        </p>
      </div>
    </section>
  );
}
