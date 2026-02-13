"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ProgressBar from "@/app/components/ProgressBar";
import { getPlacementResult } from "@/lib/placement";
import {
  STORAGE_KEYS,
  readNumber,
  readString,
  writePlacementResult,
  writeString,
} from "@/lib/placementStorage";

function countSentences(text: string): number {
  const matches = text.trim().match(/[^.!?]+[.!?]?/g);
  return matches ? matches.filter((part) => part.trim().length > 0).length : 0;
}

export default function WritingPage() {
  const router = useRouter();
  const [targetLanguage] = useState(() => readString(STORAGE_KEYS.targetLanguage, "English"));
  const [vocabScore] = useState(() => readNumber(STORAGE_KEYS.vocabScore, 0));
  const [grammarScore] = useState(() => readNumber(STORAGE_KEYS.grammarScore, 0));
  const [writingSample, setWritingSample] = useState(() => readString(STORAGE_KEYS.writingSample, ""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentenceCount = useMemo(() => countSentences(writingSample), [writingSample]);
  const canSubmit = writingSample.trim().length > 0 && sentenceCount >= 1 && sentenceCount <= 3 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Please write between 1 and 3 sentences.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const trimmedSample = writingSample.trim();
    writeString(STORAGE_KEYS.writingSample, trimmedSample);

    const placement = await getPlacementResult({
      targetLanguage,
      vocabScore,
      grammarScore,
      writingSample: trimmedSample,
    });

    writePlacementResult(placement);
    setIsSubmitting(false);
    router.push("/results");
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="theme-panel space-y-3 rounded-2xl p-5 backdrop-blur motion-safe:animate-[fade-up_600ms_ease-out_both] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Placement Step 2 of 3</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Short Writing Check</h1>
          <p className="text-sm text-slate-600">
            Write 1 to 3 sentences in {targetLanguage} so we can estimate your placement level.
          </p>
          <ProgressBar current={2} total={3} label="Placement progress" />
        </header>

        <section className="theme-panel rounded-2xl p-5 backdrop-blur motion-safe:animate-[card-enter_460ms_ease-out_both] sm:p-6">
          <label htmlFor="writing-sample" className="block text-sm font-medium text-slate-800">
            Prompt: Describe your typical day and one thing you want to improve in this language.
          </label>
          <textarea
            id="writing-sample"
            value={writingSample}
            onChange={(event) => setWritingSample(event.target.value)}
            placeholder="I usually start work at 9. I speak with customers every day..."
            className="mt-3 min-h-32 w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{sentenceCount} sentence(s)</span>
            <span>Required: 1-3 sentences</span>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-glow mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? "Evaluating..." : "Submit Writing"}
          </button>
        </section>
      </div>
    </main>
  );
}
