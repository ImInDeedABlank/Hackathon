"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ProgressBar from "@/app/components/ProgressBar";
import SectionHeader from "@/app/components/ui/SectionHeader";
import type { PlacementResult } from "@/lib/placement";
import {
  clearPlacementStorage,
  readPlacementMeta,
  readPlacementResult,
  type PlacementMeta,
} from "@/lib/placementStorage";

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
      className="app-section motion-safe:animate-[fade-up_620ms_ease-out_both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="app-kicker">{title}</h2>
      <div className="app-body app-muted mt-3 text-sm">{children}</div>
    </section>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [result] = useState<PlacementResult | null>(() => readPlacementResult());
  const [meta] = useState<PlacementMeta | null>(() => readPlacementMeta());

  const handleTryAgain = () => {
    clearPlacementStorage();
    router.push("/placement");
  };

  const handleContinue = () => {
    router.push("/mode-select");
  };

  const isRtl = lang === "ar";

  if (!result) {
    return (
      <main className="app-page theme-page">
        <div className={`app-section mx-auto w-full max-w-2xl ${isRtl ? "text-right" : "text-center"}`}>
          <h1 className="app-title-lg">{t("results_title")}</h1>
          <p className="app-body app-muted mt-2 text-sm">Complete the placement flow first.</p>
          <button
            type="button"
            onClick={() => router.push("/placement")}
            className="btn-glow focus-ring mt-5 px-4 py-2.5 text-sm"
          >
            Placement
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="app-shell app-shell-sm">
        <header className={`app-section space-y-3 motion-safe:animate-[fade-up_620ms_ease-out_both] ${isRtl ? "text-right" : "text-left"}`}>
          <SectionHeader
            as="h1"
            align={isRtl ? "right" : "left"}
            kicker="Placement Step 3 of 3"
            title={t("results_title")}
          />
          <ProgressBar current={3} total={3} label="Placement progress" />
        </header>

        <ResultCard title="Level Summary" delay={80}>
          <div className="grid gap-2 sm:grid-cols-3">
            <p>
              <span className="font-semibold text-[color:var(--text-strong)]">Level:</span> {result.level}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text-strong)]">CEFR hint:</span> {result.cefr_hint}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--text-strong)]">Confidence:</span> {result.confidence}%
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
          <p className="app-section-soft p-3">{result.feedback.corrected_version}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-[color:var(--text-strong)]">Key mistakes</p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {result.feedback.key_mistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-[color:var(--text-strong)]">Natural alternatives</p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {result.feedback.natural_alternatives.map((alternative) => (
                  <li key={alternative}>{alternative}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="app-body app-muted mt-3 text-sm">
            <span className="font-semibold text-[color:var(--text-strong)]">Grammar note:</span> {result.feedback.grammar_note}
          </p>
        </ResultCard>

        <ResultCard title="Recommended Next Step" delay={340}>
          <p>
            <span className="font-semibold text-[color:var(--text-strong)]">{t("mode_title")}:</span> {result.recommended_mode}
          </p>
          <p className="mt-2 font-semibold text-[color:var(--text-strong)]">{t("scenarios_title")}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">
            {result.recommended_scenarios.map((scenario) => (
              <li key={scenario}>{scenario}</li>
            ))}
          </ul>
        </ResultCard>

        {meta ? (
          <ResultCard title="Focus Areas" delay={390}>
            <ul className="list-disc space-y-1 ps-5">
              {meta.focus_areas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-[color:var(--text-strong)]">Cycles completed:</span> {meta.summary.cyclesCompleted}
              </p>
              <p>
                <span className="font-semibold text-[color:var(--text-strong)]">Skills:</span> Vocab {meta.summary.skillScores.vocab}, Grammar{" "}
                {meta.summary.skillScores.grammar}, Reading {meta.summary.skillScores.reading}, Writing{" "}
                {meta.summary.skillScores.writing}
              </p>
            </div>
          </ResultCard>
        ) : null}

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleTryAgain}
            className="btn-outline focus-ring px-4 py-2.5 text-sm"
          >
            {t("try_again")}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="btn-glow focus-ring px-4 py-2.5 text-sm"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    </main>
  );
}
