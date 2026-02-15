"use client";

import type { QuizOption as QuizOptionType } from "@/types/quiz";

type QuizOptionProps = {
  option: QuizOptionType;
  selected: boolean;
  disabled: boolean;
  feedbackState: "idle" | "correct" | "incorrect";
  textDir?: "ltr" | "rtl";
  onSelect: (optionId: string) => void;
};

export default function QuizOption({
  option,
  selected,
  disabled,
  feedbackState,
  textDir = "ltr",
  onSelect,
}: QuizOptionProps) {
  const feedbackClass =
    feedbackState === "correct" && selected
      ? "border-emerald-400 bg-emerald-500/15"
      : feedbackState === "incorrect" && selected
        ? "border-rose-400 bg-rose-500/10"
        : "";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      dir={textDir}
      onClick={() => onSelect(option.id)}
      className={`quiz-option group w-full rounded-xl px-4 py-3 text-sm transition duration-200 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2 sm:text-base ${
        selected ? "quiz-option-selected" : "hover:-translate-y-0.5"
      } ${feedbackClass} ${textDir === "rtl" ? "text-right" : "text-left"} disabled:cursor-not-allowed disabled:opacity-80`}
    >
      <span className="flex items-center justify-between gap-3">
        <span>{option.text}</span>
        <span
          className={`quiz-option-indicator inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
            selected ? "quiz-option-indicator-selected" : ""
          }`}
        >
          *
        </span>
      </span>
    </button>
  );
}
