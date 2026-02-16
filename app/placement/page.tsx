"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ProgressBar from "@/app/components/ProgressBar";
import SectionHeader from "@/app/components/ui/SectionHeader";
import {
  defaultPlacementState,
  MAX_PLACEMENT_CYCLES,
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

function sentenceCount(value: string): number {
  const matches = value.trim().match(/[^.!?؟]+[.!?؟]?/g);
  return matches ? matches.filter((part) => part.trim().length > 0).length : 0;
}

export default function PlacementPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = COPY[lang === "ar" ? "ar" : "en"];
  const isRtl = lang === "ar";

  const [phase, setPhase] = useState<Phase>("loading");
  const [uiLanguage, setUiLanguage] = useState<UILanguage>("en");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("English");
  const isArabicTarget = targetLanguage === "Arabic";
  const [sessionId, setSessionId] = useState("");
  const [state, setState] = useState<PlacementState>(defaultPlacementState());
  const [interviewQuestions, setInterviewQuestions] = useState<[string, string, string]>(["", "", ""]);
  const [interviewAnswers, setInterviewAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [question, setQuestion] = useState<AdaptiveQuestion | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [gradingNote, setGradingNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        const response = await fetch("/api/placement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            uiLanguage: localUi,
            targetLanguage: localTarget,
          }),
        });
        const data = (await response.json()) as PlacementStartResponse;
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
      } catch {
        setError(copy.fallbackError);
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

  const currentAnswer = question?.type === "mcq" ? selectedChoice : shortAnswer;
  const essayCount = question?.type === "essay" ? sentenceCount(shortAnswer) : 0;
  const canSubmitQuestion =
    !!question &&
    !isBusy &&
    currentAnswer.trim().length > 0 &&
    (question.type !== "essay" || (essayCount >= 1 && essayCount <= 3));

  const interviewPayload: InterviewAnswer[] = interviewQuestions.map((q, index) => ({
    q,
    a: interviewAnswers[index]?.trim() ?? "",
  }));

  async function runStep(last?: { question: AdaptiveQuestion; userAnswer: string }) {
    if (!sessionId) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "step",
          uiLanguage,
          targetLanguage,
          sessionId,
          interviewAnswers: interviewPayload,
          state,
          last,
        }),
      });
      const payload = (await response.json()) as PlacementStepQuestionResponse | PlacementStepFinalResponse;

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
      setQuestion(payload.question);
      setGradingNote(`${payload.grading.notes} (${payload.grading.scoreDelta >= 0 ? "+" : ""}${payload.grading.scoreDelta})`);
      setDecisionNote(payload.decision.reason);
      setShortAnswer("");
      setSelectedChoice("");
    } catch {
      setError(copy.fallbackError);
    } finally {
      setIsBusy(false);
    }
  }

  const handleBeginTest = async () => {
    if (!interviewReady || isBusy) return;
    await runStep(undefined);
  };

  const handleSubmitAnswer = async () => {
    if (!question || !canSubmitQuestion) return;
    const answer = question.type === "mcq" ? selectedChoice : shortAnswer;
    await runStep({
      question,
      userAnswer: answer.trim(),
    });
  };

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="app-shell app-shell-sm">
        <header className={`app-section ${isRtl ? "text-right" : "text-left"}`}>
          <SectionHeader
            as="h1"
            align={isRtl ? "right" : "left"}
            kicker={copy.title}
            title={targetLanguage}
            description={copy.subtitle}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="app-section-soft">
              <p className="app-caption">{copy.cycle}</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">{state.cycle}/{MAX_PLACEMENT_CYCLES}</p>
            </div>
            <div className="app-section-soft">
              <p className="app-caption">{copy.question}</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">{state.questionIndex}/6</p>
            </div>
            <div className="app-section-soft">
              <p className="app-caption">{copy.stability}</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--text-strong)]">{state.stability}%</p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar current={state.confidence} total={100} label={copy.confidence} />
          </div>
        </header>

        {phase === "loading" ? (
          <section className={`app-section ${isRtl ? "text-right" : "text-left"}`}>
            <p className="app-body app-muted text-sm">{copy.loading}</p>
          </section>
        ) : null}

        {phase === "interview" ? (
          <section className={`app-section ${isRtl ? "text-right" : "text-left"}`}>
            <h2 className="app-title-md">{copy.interviewTitle}</h2>
            <p className="app-caption mt-1">{copy.interviewHint}</p>
            <div className="mt-4 space-y-4">
              {interviewQuestions.map((prompt, index) => (
                <div key={`interview-${index}`}>
                  <p className="text-sm font-medium text-[color:var(--text-strong)]">{prompt}</p>
                  <textarea
                    value={interviewAnswers[index]}
                    onChange={(event) =>
                      setInterviewAnswers((prev) => {
                        const next = [...prev] as [string, string, string];
                        next[index] = event.target.value;
                        return next;
                      })
                    }
                    className={`app-textarea mt-2 ${isRtl ? "text-right" : "text-left"}`}
                    placeholder={copy.placeholder}
                    aria-label={`Interview answer ${index + 1}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleBeginTest}
                disabled={!interviewReady || isBusy}
                className="btn-glow focus-ring px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.beginTest}
              </button>
            </div>
          </section>
        ) : null}

        {phase === "test" && question ? (
          <section className={`app-section ${isRtl ? "text-right" : "text-left"}`}>
            <p className="app-kicker">
              {question.type} - {question.skill} - D{question.difficulty}
            </p>
            <p
              className={`mt-2 text-base font-medium text-[color:var(--text-strong)] ${
                isArabicTarget ? "text-right" : "text-left"
              }`}
              dir={isArabicTarget ? "rtl" : "ltr"}
            >
              {question.prompt}
            </p>

            <div className="mt-4">
              {question.type === "mcq" ? (
                <div className="space-y-2">
                  {(question.choices ?? []).map((choice) => {
                    const selected = selectedChoice === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setSelectedChoice(choice)}
                        className={`quiz-option focus-ring w-full rounded-xl px-4 py-3 text-sm ${selected ? "quiz-option-selected" : "hover:-translate-y-0.5"}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              ) : question.type === "short" || question.type === "essay" ? (
                <textarea
                  value={shortAnswer}
                  onChange={(event) => setShortAnswer(event.target.value)}
                  className={`app-textarea ${isRtl ? "text-right" : "text-left"}`}
                  placeholder={copy.placeholder}
                  dir={isArabicTarget ? "rtl" : "ltr"}
                  aria-label="Write your answer"
                />
              ) : (
                <input
                  value={shortAnswer}
                  onChange={(event) => setShortAnswer(event.target.value)}
                  className={`app-input ${isRtl ? "text-right" : "text-left"}`}
                  placeholder={copy.placeholder}
                  dir={isArabicTarget ? "rtl" : "ltr"}
                  aria-label="Type your answer"
                />
              )}
            </div>

            {question.type === "essay" ? (
              <p className="app-caption mt-2">
                {copy.essayHint} ({essayCount})
              </p>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!canSubmitQuestion}
                className="btn-glow focus-ring px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.submit}
              </button>
            </div>
          </section>
        ) : null}

        {gradingNote || decisionNote ? (
          <section className="app-section">
            <p className="app-kicker">{copy.grading}</p>
            <p className="app-body app-muted mt-1 text-sm">{gradingNote || "-"}</p>
            <p className="app-kicker mt-4">{copy.decision}</p>
            <p className="app-body app-muted mt-1 text-sm">{decisionNote || "-"}</p>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-red-300/70 bg-red-500/12 px-4 py-3 text-sm text-red-800 dark:text-red-100">{error}</section>
        ) : null}
      </div>
    </main>
  );
}

