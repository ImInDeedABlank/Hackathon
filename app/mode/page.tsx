"use client";

import { useState } from "react";
import Link from "next/link";

import type { PlacementResult } from "@/lib/placement";
import { readPlacementResult } from "@/lib/placementStorage";

export default function ModePage() {
  const [result] = useState<PlacementResult | null>(() => readPlacementResult());

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Next Step</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Mode Selection</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placement flow is complete. Voice/chat modes are not implemented yet in this scope.
        </p>

        {result ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>
              Recommended mode: <span className="font-semibold text-slate-900">{result.recommended_mode}</span>
            </p>
            <p className="mt-2">Recommended scenarios:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {result.recommended_scenarios.map((scenario) => (
                <li key={scenario}>{scenario}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link
          href="/quiz"
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Restart Placement
        </Link>
      </div>
    </main>
  );
}
