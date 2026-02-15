"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import QuizHeader from "@/app/components/quiz/QuizHeader";
import QuizProgress from "@/app/components/quiz/QuizProgress";
import QuizQuestion from "@/app/components/quiz/QuizQuestion";
import QuizResults from "@/app/components/quiz/QuizResults";
import { getQuizPack } from "@/data/quizPacks";
import { STORAGE_KEYS, readString } from "@/lib/placementStorage";
import type { QuizLanguageCode } from "@/types/quiz";

const FEEDBACK_DELAY_MS = 520;
const CELEBRATION_THRESHOLD = 70;

type FeedbackState = "idle" | "correct" | "incorrect";

type QuizPackCopy = {
  title: string;
  subtitle: string;
  packLabel: string;
};

const QUIZ_PACK_COPY: Record<QuizLanguageCode, QuizPackCopy> = {
  en: {
    title: "Vocab Quiz",
    subtitle: "Build everyday English vocabulary through quick multiple-choice rounds.",
    packLabel: "English Pack",
  },
  ar: {
    title: "اختبار المفردات",
    subtitle: "طوّر مفرداتك العربية اليومية عبر جولات سريعة من الأسئلة متعددة الخيارات.",
    packLabel: "Arabic Pack",
  },
  es: {
    title: "Quiz de Vocabulario",
    subtitle: "Mejora tu vocabulario cotidiano en español con rondas rápidas de opción múltiple.",
    packLabel: "Spanish Pack",
  },
};

function toQuizLanguageCodeFromTargetLanguage(targetLanguage: string): QuizLanguageCode {
  if (targetLanguage === "Arabic") {
    return "ar";
  }
  if (targetLanguage === "Spanish") {
    return "es";
  }
  return "en";
}

export default function VocabQuizPage() {
  const router = useRouter();
  const [quizLanguageCode] = useState<QuizLanguageCode>(() =>
    toQuizLanguageCodeFromTargetLanguage(readString(STORAGE_KEYS.targetLanguage, "English")),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [didCelebrate, setDidCelebrate] = useState(false);
  const advanceTimeoutRef = useRef<number | null>(null);

  const quizPack = useMemo(() => getQuizPack(quizLanguageCode), [quizLanguageCode]);
  const totalQuestions = quizPack.length;
  const currentQuestion = quizPack[currentIndex] ?? null;
  const answeredCount = isFinished ? totalQuestions : currentIndex;
  const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const canContinue = Boolean(selectedOptionId) && !isTransitioning && !isFinished;
  const canCelebrate = isFinished && scorePercentage >= CELEBRATION_THRESHOLD;
  const copy = QUIZ_PACK_COPY[quizLanguageCode];

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canCelebrate || didCelebrate) {
      return;
    }

    setDidCelebrate(true);
    let cancelled = false;
    const timers: number[] = [];

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) {
        return;
      }

      const sharedOptions = {
        zIndex: 90,
        disableForReducedMotion: true,
      };

      confetti({
        ...sharedOptions,
        particleCount: 60,
        spread: 70,
        startVelocity: 42,
        angle: 65,
        origin: { x: 0.14, y: 0.72 },
      });
      confetti({
        ...sharedOptions,
        particleCount: 60,
        spread: 70,
        startVelocity: 42,
        angle: 115,
        origin: { x: 0.86, y: 0.72 },
      });

      timers.push(
        window.setTimeout(() => {
          if (cancelled) {
            return;
          }
          confetti({
            ...sharedOptions,
            particleCount: 90,
            spread: 100,
            startVelocity: 46,
            origin: { x: 0.5, y: 0.68 },
          });
        }, 180),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [canCelebrate, didCelebrate]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/main");
  };

  const handleContinue = () => {
    if (!currentQuestion || !selectedOptionId || isTransitioning) {
      return;
    }

    const isCorrect = selectedOptionId === currentQuestion.correctOptionId;
    setFeedbackState(isCorrect ? "correct" : "incorrect");
    setFeedbackMessage(currentQuestion.explanation ?? null);
    setIsTransitioning(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    advanceTimeoutRef.current = window.setTimeout(() => {
      const isLastQuestion = currentIndex >= totalQuestions - 1;

      if (isLastQuestion) {
        setIsFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }

      setSelectedOptionId(null);
      setFeedbackState("idle");
      setFeedbackMessage(null);
      setIsTransitioning(false);
      advanceTimeoutRef.current = null;
    }, FEEDBACK_DELAY_MS);
  };

  const handleRetry = () => {
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    setCurrentIndex(0);
    setSelectedOptionId(null);
    setScore(0);
    setIsFinished(false);
    setFeedbackState("idle");
    setFeedbackMessage(null);
    setIsTransitioning(false);
    setDidCelebrate(false);
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5">
        <QuizHeader
          title={copy.title}
          subtitle={copy.subtitle}
          packLabel={copy.packLabel}
          onBack={handleBack}
        />

        {totalQuestions === 0 ? (
          <section className="theme-panel rounded-2xl p-6 text-center sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">Quiz content unavailable</h2>
            <p className="mt-2 text-sm text-slate-600">No questions were found for the selected language pack.</p>
          </section>
        ) : isFinished ? (
          <QuizResults
            score={score}
            total={totalQuestions}
            percentage={scorePercentage}
            showCelebrationState={canCelebrate}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <QuizProgress current={answeredCount} total={totalQuestions} />
            {currentQuestion ? (
              <QuizQuestion
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={totalQuestions}
                selectedOptionId={selectedOptionId}
                feedbackState={feedbackState}
                feedbackMessage={feedbackMessage}
                isTransitioning={isTransitioning}
                canContinue={canContinue}
                onSelectOption={setSelectedOptionId}
                onContinue={handleContinue}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
