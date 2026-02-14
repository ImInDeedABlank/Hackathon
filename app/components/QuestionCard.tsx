"use client";

import { useLanguage } from "@/components/LanguageProvider";

export type Question = {
  id: string;
  type: "vocab" | "grammar";
  question: string;
  options: string[];
  correctAnswer: string;
};

type QuestionCardProps = {
  index: number;
  total: number;
  question: Question;
  selectedAnswer?: string;
  onSelect: (answer: string) => void;
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
};

export default function QuestionCard({
  index,
  total,
  question,
  selectedAnswer,
  onSelect,
  onBack,
  onNext,
  isFirst,
  isLast,
}: QuestionCardProps) {
  const { lang, t } = useLanguage();
  const isRtl = lang === "ar";

  return (
    <section className={`theme-panel w-full rounded-2xl p-5 backdrop-blur motion-safe:animate-[card-enter_420ms_ease-out_both] sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
        {question.type} question {index + 1} of {total}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">{question.question}</h2>

      <div className="mt-5 space-y-3">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`quiz-option group w-full rounded-xl px-4 py-3 text-left text-sm transition duration-200 motion-safe:animate-[fade-up_420ms_ease-out_both] sm:text-base ${
                isSelected ? "quiz-option-selected" : "hover:-translate-y-0.5"
              } ${isRtl ? "text-right" : "text-left"}`}
              style={{ animationDelay: `${optionIndex * 70}ms` }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{option}</span>
                <span
                  className={`quiz-option-indicator inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
                    isSelected ? "quiz-option-indicator-selected" : ""
                  }`}
                >
                  *
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst}
          className="btn-outline rounded-lg px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedAnswer}
          className="btn-glow rounded-lg px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? t("continue") : t("next")}
        </button>
      </div>
    </section>
  );
}
