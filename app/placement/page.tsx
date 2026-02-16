"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ProgressBar from "@/app/components/ProgressBar";
import {
  defaultPlacementState,
  MAX_PLACEMENT_CYCLES,
  QUESTIONS_PER_CYCLE,
  normalizePlacementState,
  type AdaptiveQuestion,
  type InterviewAnswer,
  type PlacementStartResponse,
  type PlacementStepFinalResponse,
  type PlacementStepQuestionResponse,
  type PlacementState,
  type TargetLanguage,
  type UILanguage,
} from "@/lib/adaptivePlacement";
import { normalizePlacementResult } from "@/lib/placement";
import {
  STORAGE_KEYS,
  readString,
  writePlacementMeta,
  writePlacementResult,
  writeString,
} from "@/lib/placementStorage";
import { ApiFetchError, apiFetch } from "@/src/lib/apiFetch";

type Phase = "loading" | "interview" | "test";

const COPY = {
  en: {
    title: "Adaptive Placement",
    subtitle: "Interview first, then AI-adaptive cycle questions.",
    interviewTitle: "Interview",
    interviewHint: "Answer at least 2 interview questions before starting.",
    beginTest: "Start Test",
    submit: "Submit",
    cycle: "Cycle",
    question: "Question",
    confidence: "Confidence",
    stability: "Stability",
    grading: "Last Grading",
    decision: "Decision",
    loading: "Preparing placement interview...",
    placeholder: "Type your answer...",
    essayHint: "Essay answer must be 1-3 sentences.",
    fallbackError: "Could not load next step. Please retry.",
  },
  ar: {
    title: "تحديد مستوى متكيف",
    subtitle: "ابدأ بالمقابلة ثم أسئلة متكيفة حسب أدائك.",
    interviewTitle: "المقابلة",
    interviewHint: "أجب عن سؤالين على الأقل قبل بدء الاختبار.",
    beginTest: "ابدأ الاختبار",
    submit: "إرسال",
    cycle: "الدورة",
    question: "السؤال",
    confidence: "الثقة",
    stability: "الاستقرار",
    grading: "تقييم آخر إجابة",
    decision: "قرار النظام",
    loading: "يتم تجهيز مقابلة تحديد المستوى...",
    placeholder: "اكتب إجابتك...",
    essayHint: "إجابة المقال يجب أن تكون من 1 إلى 3 جمل.",
    fallbackError: "تعذر تحميل الخطوة التالية. حاول مرة أخرى.",
  },
} as const;

function asTargetLanguage(value: string): TargetLanguage {
  if (value === "Arabic" || value === "Spanish") {
    return value;
  }
  return "English";
}

function asUiLanguage(value: string): UILanguage {
  return value === "ar" ? "ar" : "en";
}


export default function PlacementPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = COPY[lang === "ar" ? "ar" : "en"];
  const isRtl = lang === "ar";

  const [phase, setPhase] = useState<Phase>("loading");
  const [uiLanguage, setUiLanguage] = useState<UILanguage>("en");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("English");
  const [sessionId, setSessionId] = useState("");
  const [state, setState] = useState<PlacementState>(defaultPlacementState());
  const [interviewQuestions, setInterviewQuestions] = useState<[string, string, string]>(["", "", ""]);
  const [interviewAnswers, setInterviewAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [cycleQuestions, setCycleQuestions] = useState<AdaptiveQuestion[]>([]);
  const [cycleAnswers, setCycleAnswers] = useState<string[]>([]);
  const [gradingNote, setGradingNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bootGuardRef = useRef<string>("");

  useEffect(() => {
    if (cooldownMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownMs]);

  useEffect(() => {
    const bootKey = `${lang}`;
    if (bootGuardRef.current === bootKey) {
      return;
    }
    bootGuardRef.current = bootKey;

    const boot = async () => {
      setIsBusy(true);
      setError(null);
      const localUi = asUiLanguage(readString(STORAGE_KEYS.uiLanguage, lang === "ar" ? "ar" : "en"));
      const localTarget = asTargetLanguage(readString(STORAGE_KEYS.targetLanguage, "English"));
      writeString(STORAGE_KEYS.uiLanguage, localUi);
      writeString(STORAGE_KEYS.targetLanguage, localTarget);
      setUiLanguage(localUi);
      setTargetLanguage(localTarget);

      try {
        const response = await apiFetch<PlacementStartResponse>("/api/placement", {
          method: "POST",
          body: {
            action: "start",
            uiLanguage: localUi,
            targetLanguage: localTarget,
          },
        });
        const data = response.data;
        if (!data.sessionId || !Array.isArray(data.interview.questions) || data.interview.questions.length < 3) {
          throw new Error("start_shape_invalid");
        }
        setSessionId(data.sessionId);
        setInterviewQuestions([
          data.interview.questions[0],
          data.interview.questions[1],
          data.interview.questions[2],
        ]);
        setState(normalizePlacementState(data.state));
        setPhase("interview");
      } catch (error) {
        if (error instanceof ApiFetchError && error.isRateLimit) {
          setCooldownMs(error.cooldownMs ?? 5000);
          setError(
            localUi === "ar"
              ? "تم تجاوز حد الطلبات. يرجى الانتظار قليلًا ثم المحاولة مرة أخرى."
              : "Rate limit reached. Please wait a few seconds and try again.",
          );
        } else {
          setError(copy.fallbackError);
        }
      } finally {
        setIsBusy(false);
      }
    };

    void boot();
  }, [copy.fallbackError, lang]);

  const answeredInterviewCount = useMemo(
    () => interviewAnswers.filter((item) => item.trim().length > 0).length,
    [interviewAnswers],
  );
  const interviewReady = answeredInterviewCount >= 2;

  const answeredCycleCount = useMemo(
    () => cycleAnswers.filter((item) => item.trim().length > 0).length,
    [cycleAnswers],
  );
  const canSubmitCycle =
    cycleQuestions.length === QUESTIONS_PER_CYCLE &&
    cycleAnswers.length === cycleQuestions.length &&
    cycleAnswers.every((item) => item.trim().length > 0) &&
    !isBusy;

  const interviewPayload: InterviewAnswer[] = interviewQuestions.map((q, index) => ({
    q,
    a: interviewAnswers[index]?.trim() ?? "",
  }));

  async function runStep(last?: { cycle: number; questions: AdaptiveQuestion[]; answers: string[] }) {
    if (!sessionId) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await apiFetch<PlacementStepQuestionResponse | PlacementStepFinalResponse>("/api/placement", {
        method: "POST",
        body: {
          action: "step",
          uiLanguage,
          targetLanguage,
          sessionId,
          interviewAnswers: interviewPayload,
          state,
          last,
        },
      });
      const payload = response.data;

      if (payload.done) {
        writePlacementResult(normalizePlacementResult(payload.placement));
        writePlacementMeta({
          focus_areas: payload.focus_areas,
          summary: payload.summary,
        });
        router.push("/results");
        return;
      }

      setPhase("test");
      setState(normalizePlacementState(payload.state));
      setCycleQuestions(payload.questions);
      setCycleAnswers(Array.from({ length: payload.questions.length }, () => ""));
      setGradingNote(
        `${payload.grading.notes} (${payload.grading.scoreDelta >= 0 ? "+" : ""}${payload.grading.scoreDelta}, ${payload.grading.cycleAverage}%)`,
      );
      setDecisionNote(payload.decision.reason);
    } catch (error) {
      if (error instanceof ApiFetchError && error.isRateLimit) {
        setCooldownMs(error.cooldownMs ?? 5000);
        setError(
          uiLanguage === "ar"
            ? "تم تجاوز حد الطلبات. يرجى الانتظار قليلًا ثم إعادة المحاولة."
            : "Rate limit reached. Please wait a bit before retrying.",
        );
      } else {
        setError(copy.fallbackError);
      }
    } finally {
      setIsBusy(false);
    }
  }

  const handleBeginTest = async () => {
    if (!interviewReady || isBusy) return;
    await runStep(undefined);
  };

  const handleSubmitCycle = async () => {
    if (!canSubmitCycle) return;
    await runStep({
      cycle: state.cycle,
      questions: cycleQuestions,
      answers: cycleAnswers.map((item) => item.trim()),
    });
  };

  const updateCycleAnswer = (index: number, value: string) => {
    setCycleAnswers((prev) => {
      const next = [...prev];
      while (next.length < cycleQuestions.length) {
        next.push("");
      }
      next[index] = value;
      return next;
    });
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className={`theme-panel rounded-2xl p-5 backdrop-blur sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{copy.title}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{targetLanguage}</h1>
          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="theme-panel-soft rounded-xl p-3">
              <p className="text-xs text-slate-500">{copy.cycle}</p>
              <p className="text-sm font-semibold text-slate-900">{state.cycle}/{MAX_PLACEMENT_CYCLES}</p>
            </div>
            <div className="theme-panel-soft rounded-xl p-3">
              <p className="text-xs text-slate-500">{copy.question}</p>
              <p className="text-sm font-semibold text-slate-900">{answeredCycleCount}/{QUESTIONS_PER_CYCLE}</p>
            </div>
            <div className="theme-panel-soft rounded-xl p-3">
              <p className="text-xs text-slate-500">{copy.stability}</p>
              <p className="text-sm font-semibold text-slate-900">{state.stability}%</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar current={state.confidence} total={100} label={copy.confidence} />
          </div>
        </header>

        {phase === "loading" ? (
          <section className={`theme-panel rounded-2xl p-5 sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <p className="text-sm text-slate-700">{copy.loading}</p>
          </section>
        ) : null}

        {phase === "interview" ? (
          <section className={`theme-panel rounded-2xl p-5 sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="text-lg font-semibold text-slate-900">{copy.interviewTitle}</h2>
            <p className="mt-1 text-xs text-slate-500">{copy.interviewHint}</p>
            <div className="mt-4 space-y-4">
              {interviewQuestions.map((prompt, index) => (
                <div key={`interview-${index}`}>
                  <p className="text-sm font-medium text-slate-800">{prompt}</p>
                  <textarea
                    value={interviewAnswers[index]}
                    onChange={(event) =>
                      setInterviewAnswers((prev) => {
                        const next = [...prev] as [string, string, string];
                        next[index] = event.target.value;
                        return next;
                      })
                    }
                    className="mt-2 min-h-20 w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder={copy.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleBeginTest}
                disabled={!interviewReady || isBusy || cooldownMs > 0}
                className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.beginTest}
              </button>
            </div>
          </section>
        ) : null}

        {phase === "test" && cycleQuestions.length > 0 ? (
          <section className={`theme-panel rounded-2xl p-5 sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
            <div className="space-y-4">
              {cycleQuestions.map((cycleQuestion, index) => {
                const answer = cycleAnswers[index] ?? "";
                return (
                  <article key={cycleQuestion.id} className="theme-panel-soft rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                      Q{index + 1} | {cycleQuestion.type} | {cycleQuestion.skill} | D{cycleQuestion.difficulty}
                    </p>
                    <p className="mt-2 text-base font-medium text-slate-900">{cycleQuestion.prompt}</p>

                    <div className="mt-3">
                      {cycleQuestion.type === "mcq" ? (
                        <div className="space-y-2">
                          {(cycleQuestion.choices ?? []).map((choice) => {
                            const selected = answer === choice;
                            return (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => updateCycleAnswer(index, choice)}
                                className={`quiz-option w-full rounded-xl px-4 py-3 text-sm transition ${selected ? "quiz-option-selected" : "hover:-translate-y-0.5"}`}
                              >
                                {choice}
                              </button>
                            );
                          })}
                        </div>
                      ) : cycleQuestion.type === "short" || cycleQuestion.type === "essay" ? (
                        <textarea
                          value={answer}
                          onChange={(event) => updateCycleAnswer(index, event.target.value)}
                          className="min-h-24 w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          placeholder={copy.placeholder}
                        />
                      ) : (
                        <input
                          value={answer}
                          onChange={(event) => updateCycleAnswer(index, event.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          placeholder={copy.placeholder}
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSubmitCycle}
                disabled={!canSubmitCycle || cooldownMs > 0}
                className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.submit}
              </button>
            </div>
          </section>
        ) : null}

        {gradingNote || decisionNote ? (
          <section className="theme-panel rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{copy.grading}</p>
            <p className="mt-1 text-sm text-slate-700">{gradingNote || "-"}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{copy.decision}</p>
            <p className="mt-1 text-sm text-slate-700">{decisionNote || "-"}</p>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</section>
        ) : null}
      </div>
    </main>
  );
}
