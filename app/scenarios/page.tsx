"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ScenarioCard from "@/app/components/ScenarioCard";
import { STORAGE_KEYS, writeString } from "@/lib/placementStorage";

const SCENARIOS = ["Airport", "Ordering Food", "Job Interview", "Hotel Check-in", "Doctor Visit"] as const;

export default function ScenariosPage() {
  const router = useRouter();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const handleSelect = (scenario: string) => {
    setSelectedScenario(scenario);
    writeString(STORAGE_KEYS.selectedScenario, scenario);
    router.push("/chat");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Session Setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Select a Scenario</h1>
        <p className="mt-2 text-sm text-slate-600">Choose one real-life context to start the conversation.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <ScenarioCard
              key={scenario}
              name={scenario}
              selected={selectedScenario === scenario}
              onSelect={() => handleSelect(scenario)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
