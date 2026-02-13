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
    <section className="w-full rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
        {question.type} question {index + 1} of {total}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">{question.question}</h2>

      <div className="mt-5 space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition sm:text-base ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedAnswer}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? "Continue" : "Next"}
        </button>
      </div>
    </section>
  );
}
