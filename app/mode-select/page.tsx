"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ModeCard from "@/app/components/ModeCard";
import {
  STORAGE_KEYS,
  readPlacementResult,
  readString,
  writeString,
} from "@/lib/placementStorage";

type ModeOption = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    key: "Text Chat",
    icon: "TXT",
    title: "Text Chat",
    subtitle: "Type messages and get instant correction feedback.",
  },
  {
    key: "Voice",
    icon: "MIC",
    title: "Voice",
    subtitle: "Speak naturally and practice pronunciation flow.",
  },
  {
    key: "Roleplay",
    icon: "RPG",
    title: "Roleplay",
    subtitle: "Scenario-first coaching with guided conversation prompts.",
  },
];

function normalizeMode(rawMode: string): string {
  const lower = rawMode.toLowerCase();
  if (lower.includes("voice")) {
    return "Voice";
  }
  if (lower.includes("roleplay")) {
    return "Roleplay";
  }
  return "Text Chat";
}

export default function ModeSelectPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState(() => {
    const saved = readString(STORAGE_KEYS.selectedMode, "");
    if (saved) {
      return saved;
    }
    const recommended = readPlacementResult()?.recommended_mode ?? "Text Chat";
    return normalizeMode(recommended);
  });

  const handleContinue = () => {
    if (!selectedMode) {
      return;
    }
    writeString(STORAGE_KEYS.selectedMode, selectedMode);
    router.push("/scenarios");
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto w-full max-w-4xl">
        <section className="theme-panel rounded-2xl p-6 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Practice Setup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Choose Your Mode</h1>
          <p className="mt-2 text-sm text-slate-600">Pick how you want to practice before selecting a scenario.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MODE_OPTIONS.map((mode) => (
              <ModeCard
                key={mode.key}
                icon={mode.icon}
                title={mode.title}
                subtitle={mode.subtitle}
                selected={selectedMode === mode.key}
                onSelect={() => setSelectedMode(mode.key)}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedMode}
              className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue to Scenarios
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
