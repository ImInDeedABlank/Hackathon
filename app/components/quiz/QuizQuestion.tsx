"use client";

import { useLanguage } from "@/components/LanguageProvider";
import QuizOption from "@/app/components/quiz/QuizOption";
import type { QuizQuestion as QuizQuestionType } from "@/types/quiz";

type QuizQuestionProps = {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  selectedOptionId: string | null;
  feedbackState: "idle" | "correct" | "incorrect";
  feedbackMessage: string | null;
  isTransitioning: boolean;
  canContinue: boolean;
  onSelectOption: (optionId: string) => void;
  onContinue: () => void;
};

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  feedbackState,
  feedbackMessage,
  isTransitioning,
  canContinue,
  onSelectOption,
  onContinue,
}: QuizQuestionProps) {
  const { lang } = useLanguage();
  const isRtl = lang === "ar";
  const questionTextDir = question.languageCode === "ar" ? "rtl" : "ltr";
  const isLastQuestion = questionNumber === totalQuestions;
  const continueLabel = isTransitioning ? "Checking..." : isLastQuestion ? "Finish Quiz" : "Continue";

  return (
    <section className={`app-section motion-safe:animate-[card-enter_420ms_ease-out_both] ${isRtl ? "text-right" : "text-left"}`}>
      <p className="app-kicker">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2
        dir={questionTextDir}
        className={`app-title-md mt-2 ${questionTextDir === "rtl" ? "text-right" : "text-left"}`}
      >
        {question.prompt}
      </h2>

      {feedbackState !== "idle" ? (
        <p
          dir={questionTextDir}
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            feedbackState === "correct"
              ? "border-emerald-400/70 bg-emerald-500/12 text-[color:var(--text-strong)]"
              : "border-rose-400/70 bg-rose-500/12 text-[color:var(--text-strong)]"
          }`}
        >
          <span className="font-semibold">{feedbackState === "correct" ? "Correct." : "Not quite."}</span>{" "}
          {feedbackMessage}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {question.options.map((option) => (
          <QuizOption
            key={option.id}
            option={option}
            selected={selectedOptionId === option.id}
            disabled={isTransitioning}
            textDir={questionTextDir}
            feedbackState={selectedOptionId === option.id ? feedbackState : "idle"}
            onSelect={onSelectOption}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="btn-glow focus-ring px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
        >
          {continueLabel}
        </button>
      </div>
    </section>
  );
}
