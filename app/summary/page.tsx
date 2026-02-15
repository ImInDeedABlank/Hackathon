"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import {
  STORAGE_KEYS,
  readNumber,
  readSessionTurns,
  readString,
  writeNumber,
  writeSessionTurns,
} from "@/lib/placementStorage";
import type { SessionTurn } from "@/lib/validate";

type SummaryResponse = {
  finalScore: number;
  overallReview: string;
  strengths: string[];
  weaknesses: string[];
  focusAreas: string[];
  nextSteps: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fallbackSummary(turns: SessionTurn[], uiLanguage: "en" | "ar"): SummaryResponse {
  const avg = turns.length > 0 ? turns.reduce((sum, turn) => sum + turn.score, 0) / turns.length : 0;

  if (uiLanguage === "ar") {
    return {
      finalScore: clamp(Math.round(avg * 10), 0, 100),
      overallReview:
        turns.length > 0
          ? "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u062E\u0635 \u0628\u062F\u064A\u0644 \u0644\u0623\u0646 \u0627\u0644\u062E\u062F\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627."
          : "\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0648\u0644\u0627\u062A \u0645\u0643\u062A\u0645\u0644\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629.",
      strengths: [
        "\u0623\u0643\u0645\u0644\u062A \u062C\u0644\u0633\u0629 \u062A\u062F\u0631\u064A\u0628.",
        "\u062D\u0635\u0644\u062A \u0639\u0644\u0649 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0644\u0643\u0644 \u062C\u0648\u0644\u0629.",
        "\u062D\u0627\u0641\u0638\u062A \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631\u064A\u0629 \u0641\u064A \u0627\u0644\u062A\u062F\u0631\u064A\u0628.",
      ],
      weaknesses: [
        "\u0645\u0627 \u0632\u0627\u0644\u062A \u0628\u0639\u0636 \u0627\u0644\u0631\u062F\u0648\u062F \u062A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646\u0627 \u0646\u062D\u0648\u064A\u0627.",
        "\u0628\u0639\u0636 \u0627\u0644\u0635\u064A\u0627\u063A\u0627\u062A \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0623\u0643\u062B\u0631 \u0637\u0628\u064A\u0639\u064A\u0629.",
        "\u062A\u062D\u062A\u0627\u062C \u0628\u0639\u0636 \u0627\u0644\u0631\u062F\u0648\u062F \u0625\u0644\u0649 \u0648\u0636\u0648\u062D \u0623\u0643\u0628\u0631.",
      ],
      focusAreas: [
        "\u0627\u062A\u0633\u0627\u0642 \u0627\u0644\u0642\u0648\u0627\u0639\u062F",
        "\u0635\u064A\u0627\u063A\u0629 \u0637\u0628\u064A\u0639\u064A\u0629",
        "\u0637\u0644\u0627\u0642\u0629 \u0627\u0644\u0633\u064A\u0646\u0627\u0631\u064A\u0648",
      ],
      nextSteps: [
        "\u0623\u0639\u062F \u0627\u0644\u0633\u064A\u0646\u0627\u0631\u064A\u0648 \u0646\u0641\u0633\u0647 \u0648\u0627\u0633\u062A\u0647\u062F\u0641 \u062F\u0631\u062C\u0627\u062A \u0623\u0639\u0644\u0649.",
        "\u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0645\u0635\u062D\u062D\u0629 \u0642\u0628\u0644 \u0627\u0644\u0631\u062F \u0627\u0644\u062A\u0627\u0644\u064A.",
        "\u062A\u062F\u0631\u0628 \u064A\u0648\u0645\u064A\u0627 \u0628\u062C\u0644\u0633\u0627\u062A \u0642\u0635\u064A\u0631\u0629.",
      ],
    };
  }

  return {
    finalScore: clamp(Math.round(avg * 10), 0, 100),
    overallReview:
      turns.length > 0
        ? "AI summary was unavailable, so this fallback summary uses your turn scores."
        : "No completed turns were found yet.",
    strengths: [
      "You completed a guided session.",
      "You collected per-turn feedback.",
      "You stayed active in practice.",
    ],
    weaknesses: [
      "Some responses still need grammar corrections.",
      "Natural phrasing can improve further.",
      "Some responses can be clearer and shorter.",
    ],
    focusAreas: ["Grammar consistency", "Natural alternatives", "Scenario fluency"],
    nextSteps: [
      "Retry this scenario and aim for higher turn scores.",
      "Use corrected versions before your next attempt.",
      "Practice one short session daily.",
    ],
  };
}

function scoreClass(score: number): string {
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (score >= 60) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export default function SummaryPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const uiLanguage: "en" | "ar" = lang === "ar" ? "ar" : "en";

  const [mode] = useState<"Text" | "Speak">(() =>
    readString(STORAGE_KEYS.selectedMode, "Text") === "Speak" ? "Speak" : "Text",
  );
  const [scenario] = useState(() =>
    readString(
      mode === "Speak" ? STORAGE_KEYS.speakSelectedScenario : STORAGE_KEYS.selectedScenario,
      "Ordering Food",
    ),
  );
  const [exchanges] = useState(() => readNumber(STORAGE_KEYS.sessionExchanges, 0));
  const [targetLanguage] = useState<"English" | "Arabic" | "Spanish">(() => {
    const value = readString(STORAGE_KEYS.targetLanguage, readString("targetLanguage", "English"));
    if (value === "Arabic" || value === "Spanish") {
      return value;
    }
    return "English";
  });
  const [turns] = useState<SessionTurn[]>(() => readSessionTurns());

  const completedTurns = useMemo(
    () => turns.filter((turn) => turn.ai.trim().length > 0),
    [turns],
  );

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uiLanguage,
            targetLanguage,
            scenario,
            mode,
            turns: completedTurns,
          }),
        });

        if (!response.ok) {
          throw new Error("summary_api_http_error");
        }

        const data = (await response.json()) as SummaryResponse;

        if (!cancelled) {
          setSummary(data);
        }
      } catch {
        if (!cancelled) {
          setSummary(fallbackSummary(completedTurns, uiLanguage));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [mode, scenario, targetLanguage, completedTurns, uiLanguage]);

  const resolvedSummary = useMemo(
    () => summary ?? fallbackSummary(completedTurns, uiLanguage),
    [summary, completedTurns, uiLanguage],
  );

  const handleRetryScenario = () => {
    writeNumber(STORAGE_KEYS.sessionExchanges, 0);
    writeSessionTurns([]);
    router.push("/chat");
  };

  const handleNewScenario = () => {
    writeNumber(STORAGE_KEYS.sessionExchanges, 0);
    writeSessionTurns([]);
    router.push(mode === "Speak" ? "/speak-scenarios" : "/scenarios");
  };

  const handleBackToModeSelect = () => {
    writeNumber(STORAGE_KEYS.sessionExchanges, 0);
    writeSessionTurns([]);
    router.push("/mode-select");
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <section className="theme-panel relative mx-auto w-full max-w-4xl rounded-2xl p-6 backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("summary_session_title")}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("summary_practice_title")}</h1>

        <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <p className="rounded-xl bg-slate-50 p-3">
            <span className="font-semibold text-slate-900">{t("summary_mode_label")}:</span> {mode}
          </p>
          <p className="rounded-xl bg-slate-50 p-3">
            <span className="font-semibold text-slate-900">{t("summary_scenario_label")}:</span> {scenario}
          </p>
          <p className="rounded-xl bg-slate-50 p-3">
            <span className="font-semibold text-slate-900">{t("summary_exchanges_label")}:</span> {exchanges}/5
          </p>
        </div>

        <article className={`mt-6 rounded-2xl border p-5 text-center ${scoreClass(resolvedSummary.finalScore)}`}>
          <p className="text-xs font-semibold uppercase tracking-wide">{t("summary_final_score")}</p>
          <p className="mt-2 text-5xl font-semibold">{resolvedSummary.finalScore}</p>
          <p className="text-sm">/100</p>
        </article>

        <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white/85 p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{t("summary_overall_review")}</h2>
            <p className="mt-2 text-sm text-slate-700">{isLoading ? t("summary_generating") : resolvedSummary.overallReview}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("summary_strengths")}</h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
                {resolvedSummary.strengths.map((item, index) => (
                  <li key={`strength-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("summary_weaknesses")}</h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
                {resolvedSummary.weaknesses.map((item, index) => (
                  <li key={`weakness-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("summary_focus_areas")}</h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
                {resolvedSummary.focusAreas.map((item, index) => (
                  <li key={`focus-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t("summary_next_steps")}</h3>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700">
                {resolvedSummary.nextSteps.map((item, index) => (
                  <li key={`next-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{t("summary_responses_feedback")}</h2>

          {completedTurns.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{t("summary_no_turns")}</p>
          ) : (
            <div className="mt-4 space-y-4">
              {completedTurns.map((turn, index) => (
                <article key={`${turn.user}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{t("summary_turn_label")} {index + 1}</p>
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                      {t("score_label")}: {clamp(Math.round(turn.score), 0, 10)}/10
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-900">{t("your_response_label")}:</span> {turn.user}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">{t("corrected_version_label")}:</span> {turn.feedback.corrected_version}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">{t("key_mistakes_label")}:</span> {turn.feedback.key_mistakes.join(" | ")}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">{t("natural_alternatives_label")}:</span>{" "}
                      {turn.feedback.natural_alternatives.join(" | ")}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">{t("grammar_note_label")}:</span> {turn.feedback.grammar_note}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">{t("improvement_tip_label")}:</span> {turn.feedback.improvement_tip}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRetryScenario}
            className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {t("retry_scenario")}
          </button>
          <button
            type="button"
            onClick={handleNewScenario}
            className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {t("new_scenario")}
          </button>
          <button
            type="button"
            onClick={handleBackToModeSelect}
            className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {t("back_to_mode_select")}
          </button>
        </div>
      </section>
    </main>
  );
}

