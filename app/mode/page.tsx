"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ModeCard from "@/app/components/ModeCard";
import { STORAGE_KEYS, writeString } from "@/lib/placementStorage";

export default function ModePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<"Speak" | "Text" | null>(null);

  const handleContinue = () => {
    if (!selectedMode) {
      return;
    }
    writeString(STORAGE_KEYS.selectedMode, selectedMode);
    router.push("/scenarios");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Session Setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Choose Your Mode</h1>
        <p className="mt-2 text-sm text-slate-600">Pick how you want to practice in this session.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ModeCard
            icon="🎤"
            title="Speak Mode"
            subtitle="Speaking and listening practice with transcript support."
            selected={selectedMode === "Speak"}
            onSelect={() => setSelectedMode("Speak")}
          />
          <ModeCard
            icon="💬"
            title="Text Mode"
            subtitle="Reading and writing practice with chat-based interaction."
            selected={selectedMode === "Text"}
            onSelect={() => setSelectedMode("Text")}
          />
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedMode}
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </main>
  );
}
