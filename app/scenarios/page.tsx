"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ScenarioCard from "@/app/components/ScenarioCard";
import {
  STORAGE_KEYS,
  readPlacementResult,
  readString,
  writeNumber,
  writeString,
} from "@/lib/placementStorage";

const DEFAULT_SCENARIOS = [
  "Airport",
  "Ordering Food",
  "Job Interview",
  "Hotel Check-in",
  "Doctor Visit",
] as const;

export default function ScenariosPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedMode] = useState(() => readString(STORAGE_KEYS.selectedMode, "Text"));
  const [recommendedScenarios] = useState(() => readPlacementResult()?.recommended_scenarios ?? []);

  const scenarioOptions = useMemo(() => {
    const merged = [...recommendedScenarios, ...DEFAULT_SCENARIOS];
    return Array.from(new Set(merged)).slice(0, 6);
  }, [recommendedScenarios]);

  const handleSelect = (scenario: string) => {
    setSelectedScenario(scenario);
    writeString(STORAGE_KEYS.selectedScenario, scenario);
    writeNumber(STORAGE_KEYS.sessionExchanges, 0);
    router.push("/chat");
  };

  const modeLabel = selectedMode === "Speak" ? t("speak_mode") : t("text_mode");
  const isRtl = lang === "ar";

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className={`theme-panel relative mx-auto w-full max-w-4xl rounded-2xl p-6 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Session Setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("scenarios_title")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("mode_title")}: <span className="font-semibold text-slate-900">{modeLabel}</span>
        </p>
        <p className="mt-1 text-sm text-slate-600">Choose one real-life context to start the conversation.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarioOptions.map((scenario) => (
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
