"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import ProgressBar from "@/app/components/ProgressBar";
import type { PlacementResult } from "@/lib/placement";
import { clearPlacementStorage, readPlacementResult } from "@/lib/placementStorage";

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{title}</h2>
      <div className="mt-3 text-sm text-slate-700">{children}</div>
    </section>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [result] = useState<PlacementResult | null>(() => readPlacementResult());

  const handleTryAgain = () => {
    clearPlacementStorage();
    router.push("/quiz");
  };

  const handleContinue = () => {
    router.push("/mode");
  };

  if (!result) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/70 bg-white/80 p-6 text-center shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold text-slate-900">No Placement Result Yet</h1>
          <p className="mt-2 text-sm text-slate-600">Complete the quiz and writing steps first.</p>
          <button
            type="button"
            onClick={() => router.push("/quiz")}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to Quiz
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="space-y-3 rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Placement Step 3 of 3</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your Placement Result</h1>
          <ProgressBar current={3} total={3} label="Placement progress" />
        </header>

        <ResultCard title="Level Summary">
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
        </ResultCard>

        <ResultCard title="Strengths">
          <ul className="list-disc space-y-1 pl-5">
            {result.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResultCard>

        <ResultCard title="Weaknesses">
          <ul className="list-disc space-y-1 pl-5">
            {result.weaknesses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ResultCard>

        <ResultCard title="Feedback">
          <p className="rounded-xl bg-slate-50 p-3 text-slate-700">{result.feedback.corrected_version}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-medium text-slate-900">Key mistakes</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {result.feedback.key_mistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-900">Natural alternatives</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {result.feedback.natural_alternatives.map((alternative) => (
                  <li key={alternative}>{alternative}</li>
                ))}
              </ul>
            </div>
          </div>
        </ResultCard>

        <ResultCard title="Recommended Next Step">
          <p>
            <span className="font-medium">Mode:</span> {result.recommended_mode}
          </p>
          <p className="mt-2 font-medium text-slate-900">Scenarios</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.recommended_scenarios.map((scenario) => (
              <li key={scenario}>{scenario}</li>
            ))}
          </ul>
        </ResultCard>

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleTryAgain}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
