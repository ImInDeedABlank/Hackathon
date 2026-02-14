"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";

type QuizResultsProps = {
  score: number;
  total: number;
  percentage: number;
  showCelebrationState: boolean;
  onRetry: () => void;
};

function getPerformanceMessage(percentage: number): string {
  if (percentage >= 85) {
    return "Excellent work. Your everyday vocabulary is strong.";
  }
  if (percentage >= 70) {
    return "Great progress. You are building solid vocabulary control.";
  }
  if (percentage >= 50) {
    return "Good start. A little more practice will improve your speed.";
  }
  return "Keep going. Repeat the quiz and focus on word meanings first.";
}

export default function QuizResults({
  score,
  total,
  percentage,
  showCelebrationState,
  onRetry,
}: QuizResultsProps) {
  const { lang } = useLanguage();
  const isRtl = lang === "ar";
  const message = getPerformanceMessage(percentage);

  return (
    <section className={`theme-panel rounded-2xl p-6 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
      <p className="theme-kicker text-xs font-semibold uppercase tracking-[0.14em]">Quiz Complete</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Your Results</h2>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">{message}</p>

      <div className="theme-panel-soft mt-5 rounded-xl p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Score</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
          {score}/{total}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-700">{percentage}% correct</p>
        {showCelebrationState ? (
          <p className="mt-3 rounded-lg border border-emerald-400/65 bg-emerald-500/12 px-3 py-2 text-sm text-slate-900">
            Strong performance. Celebration unlocked.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onRetry}
          className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
        >
          Retry Quiz
        </button>
        <Link
          href="/"
          className="btn-glow inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
        >
          Back Home
        </Link>
      </div>
    </section>
  );
}
