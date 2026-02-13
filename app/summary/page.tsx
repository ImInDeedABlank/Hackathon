"use client";

import { useRouter } from "next/navigation";

import { STORAGE_KEYS, readNumber, readString } from "@/lib/placementStorage";

export default function SummaryPage() {
  const router = useRouter();
  const mode = readString(STORAGE_KEYS.selectedMode, "Text");
  const scenario = readString(STORAGE_KEYS.selectedScenario, "Ordering Food");
  const exchanges = readNumber(STORAGE_KEYS.sessionExchanges, 1);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Session Complete</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Practice Summary</h1>
        <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <p className="rounded-xl bg-slate-50 p-3">
            <span className="font-semibold text-slate-900">Mode:</span> {mode}
          </p>
          <p className="rounded-xl bg-slate-50 p-3">
            <span className="font-semibold text-slate-900">Scenario:</span> {scenario}
          </p>
          <p className="rounded-xl bg-slate-50 p-3">
            <span className="font-semibold text-slate-900">Exchanges:</span> {exchanges}/5
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/scenarios")}
            className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            Try Another Scenario
          </button>
          <button
            type="button"
            onClick={() => router.push("/mode-select")}
            className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Change Mode
          </button>
        </div>
      </div>
    </main>
  );
}
