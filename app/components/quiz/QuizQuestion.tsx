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
  const isLastQuestion = questionNumber === totalQuestions;
  const continueLabel = isTransitioning ? "Checking..." : isLastQuestion ? "Finish Quiz" : "Continue";

  return (
    <section className={`theme-panel rounded-2xl p-5 backdrop-blur motion-safe:animate-[card-enter_420ms_ease-out_both] sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
      <p className="theme-kicker text-xs font-semibold uppercase tracking-[0.14em]">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{question.prompt}</h2>

      {feedbackState !== "idle" ? (
        <p
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            feedbackState === "correct"
              ? "border-emerald-400/70 bg-emerald-500/12 text-slate-900"
              : "border-rose-400/70 bg-rose-500/12 text-slate-900"
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
          className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
        >
          {continueLabel}
        </button>
      </div>
    </section>
  );
}
