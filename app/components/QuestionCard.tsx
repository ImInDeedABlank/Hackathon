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
  return (
    <section className="theme-panel w-full rounded-2xl p-5 backdrop-blur motion-safe:animate-[card-enter_420ms_ease-out_both] sm:p-6">
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
              className={`group w-full rounded-xl border px-4 py-3 text-left text-sm transition duration-200 motion-safe:animate-[fade-up_420ms_ease-out_both] sm:text-base ${
                isSelected
                  ? "border-cyan-500 bg-cyan-50 text-slate-900 shadow-[0_8px_24px_-18px_rgba(8,145,178,0.6)]"
                  : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-cyan-300"
              }`}
              style={{ animationDelay: `${optionIndex * 70}ms` }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{option}</span>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500 text-white"
                      : "border-slate-300 bg-white text-transparent group-hover:border-cyan-300"
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
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedAnswer}
          className="btn-glow rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? "Continue" : "Next"}
        </button>
      </div>
    </section>
  );
}
