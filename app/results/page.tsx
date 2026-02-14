"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ProgressBar from "@/app/components/ProgressBar";
import type { PlacementResult } from "@/lib/placement";
import { clearPlacementStorage, readPlacementResult } from "@/lib/placementStorage";

function ResultCard({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="theme-panel rounded-2xl p-5 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">{title}</h2>
      <div className="mt-3 text-sm text-slate-700">{children}</div>
    </section>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [result] = useState<PlacementResult | null>(() => readPlacementResult());

  const handleTryAgain = () => {
    clearPlacementStorage();
    router.push("/quiz");
  };

  const handleContinue = () => {
    router.push("/mode-select");
  };

  const isRtl = lang === "ar";

  if (!result) {
    return (
      <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div className={`theme-panel mx-auto w-full max-w-2xl rounded-2xl p-6 backdrop-blur ${isRtl ? "text-right" : "text-center"}`}>
          <h1 className="text-2xl font-semibold text-slate-900">{t("results_title")}</h1>
          <p className="mt-2 text-sm text-slate-600">Complete the quiz and writing steps first.</p>
          <button
            type="button"
            onClick={() => router.push("/quiz")}
            className="btn-glow mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {t("quiz_title")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className={`theme-panel space-y-3 rounded-2xl p-5 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Placement Step 3 of 3</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("results_title")}</h1>
          <ProgressBar current={3} total={3} label="Placement progress" />
        </header>

        <ResultCard title="Level Summary" delay={80}>
          <div className="grid gap-2 sm:grid-cols-3">
            <p>
              <span className="font-medium">Level:</span> {result.level}
            </p>
            <p>
              <span className="font-medium">CEFR hint:</span> {result.cefr_hint}
            </p>
            <p>
              <span className="font-medium">Confidence:</span> {result.confidence}%
            </p>
          </div>
          <div className="mt-4">
            <ProgressBar current={result.confidence} total={100} label="Confidence meter" />
          </div>
        </ResultCard>

        <ResultCard title={t("strengths")} delay={140}>
          <ul className="list-disc space-y-1 ps-5">
            {result.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResultCard>

        <ResultCard title={t("weaknesses")} delay={210}>
          <ul className="list-disc space-y-1 ps-5">
            {result.weaknesses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResultCard>

        <ResultCard title="Feedback" delay={280}>
          <p className="theme-panel-soft rounded-xl p-3 text-slate-700">{result.feedback.corrected_version}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-medium text-slate-900">Key mistakes</p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {result.feedback.key_mistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-900">Natural alternatives</p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {result.feedback.natural_alternatives.map((alternative) => (
                  <li key={alternative}>{alternative}</li>
                ))}
              </ul>
            </div>
          </div>
        </ResultCard>

        <ResultCard title="Recommended Next Step" delay={340}>
          <p>
            <span className="font-medium">{t("mode_title")}:</span> {result.recommended_mode}
          </p>
          <p className="mt-2 font-medium text-slate-900">{t("scenarios_title")}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">
            {result.recommended_scenarios.map((scenario) => (
              <li key={scenario}>{scenario}</li>
            ))}
          </ul>
        </ResultCard>

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleTryAgain}
            className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {t("try_again")}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    </main>
  );
}
