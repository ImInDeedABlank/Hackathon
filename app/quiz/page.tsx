"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ProgressBar from "@/app/components/ProgressBar";
import QuestionCard, { type Question } from "@/app/components/QuestionCard";
import { STORAGE_KEYS, writeNumber, writeString } from "@/lib/placementStorage";

const QUESTIONS: Question[] = [
  {
    id: "vocab-1",
    type: "vocab",
    question: 'Choose the best meaning of "commute".',
    options: ["To travel between home and work", "To cook dinner", "To study grammar", "To buy groceries"],
    correctAnswer: "To travel between home and work",
  },
  {
    id: "vocab-2",
    type: "vocab",
    question: 'Pick the closest synonym for "assist".',
    options: ["Ignore", "Help", "Forget", "Delay"],
    correctAnswer: "Help",
  },
  {
    id: "grammar-1",
    type: "grammar",
    question: "She ___ to the office every day.",
    options: ["go", "goes", "going", "gone"],
    correctAnswer: "goes",
  },
  {
    id: "grammar-2",
    type: "grammar",
    question: "If I ___ more time, I would practice speaking.",
    options: ["have", "had", "has", "having"],
    correctAnswer: "had",
  },
];

export default function QuizPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const queryLanguage = query?.get("targetLanguage") ?? query?.get("lang") ?? "English";
    writeString(STORAGE_KEYS.targetLanguage, queryLanguage);
  }, []);

  const currentQuestion = QUESTIONS[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];

  const progressCurrent = useMemo(() => currentIndex + 1, [currentIndex]);

  const handleSelect = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleBack = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!selectedAnswer) {
      return;
    }

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    const scored = QUESTIONS.reduce(
      (acc, question) => {
        const isCorrect = answers[question.id] === question.correctAnswer;
        if (!isCorrect) {
          return acc;
        }
        if (question.type === "vocab") {
          return { ...acc, vocab: acc.vocab + 1 };
        }
        return { ...acc, grammar: acc.grammar + 1 };
      },
      { vocab: 0, grammar: 0 },
    );

    writeNumber(STORAGE_KEYS.vocabScore, scored.vocab);
    writeNumber(STORAGE_KEYS.grammarScore, scored.grammar);
    router.push("/writing");
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="theme-panel space-y-3 rounded-2xl p-5 backdrop-blur motion-safe:animate-[fade-up_600ms_ease-out_both] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Placement Step 1 of 3</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quick MCQ Check</h1>
          <p className="text-sm text-slate-600">
            Answer 4 quick questions. We use this together with your writing sample.
          </p>
          <ProgressBar current={progressCurrent} total={QUESTIONS.length} label="Quiz progress" />
        </header>

        <QuestionCard
          key={currentQuestion.id}
          index={currentIndex}
          total={QUESTIONS.length}
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          onSelect={handleSelect}
          onBack={handleBack}
          onNext={handleNext}
          isFirst={currentIndex === 0}
          isLast={currentIndex === QUESTIONS.length - 1}
        />
      </div>
    </main>
  );
}
