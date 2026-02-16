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
    <section className={`app-section motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
      <p className="app-kicker">Quiz Complete</p>
      <h2 className="app-title-lg mt-2">Your Results</h2>
      <p className="app-body app-muted mt-2 text-sm">{message}</p>

      <div className="app-section-soft mt-5 sm:p-5">
        <p className="app-caption text-xs font-semibold uppercase tracking-[0.14em]">Score</p>
        <p className="mt-2 text-3xl font-semibold text-[color:var(--text-strong)] sm:text-4xl">
          {score}/{total}
        </p>
        <p className="app-muted mt-1 text-sm font-medium">{percentage}% correct</p>
        {showCelebrationState ? (
          <p className="mt-3 rounded-lg border border-emerald-400/65 bg-emerald-500/12 px-3 py-2 text-sm text-[color:var(--text-strong)]">
            Strong performance. Celebration unlocked.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onRetry}
          className="btn-outline focus-ring px-4 py-2.5 text-sm"
        >
          Retry Quiz
        </button>
        <Link
          href="/"
          className="btn-glow focus-ring px-4 py-2.5 text-sm"
        >
          Back Home
        </Link>
      </div>
    </section>
  );
}
