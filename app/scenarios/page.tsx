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

type ScenarioMeta = {
  icon: string;
  difficulty: string;
  description: string;
};

const SCENARIO_META: Record<string, ScenarioMeta> = {
  "buying groceries": {
    icon: "🛒",
    difficulty: "Beginner",
    description: "Ask for prices, quantities, and common grocery items.",
  },
  "asking for directions": {
    icon: "🧭",
    difficulty: "Beginner",
    description: "Practice navigation questions and location phrases.",
  },
  airport: {
    icon: "✈️",
    difficulty: "Intermediate",
    description: "Handle check-in, boarding, and baggage follow-up questions.",
  },
  "ordering food": {
    icon: "🍽️",
    difficulty: "Beginner",
    description: "Order meals clearly and ask for menu recommendations.",
  },
  "job interview": {
    icon: "💼",
    difficulty: "Advanced",
    description: "Answer professional questions with clear, confident language.",
  },
  "hotel check-in": {
    icon: "🏨",
    difficulty: "Intermediate",
    description: "Confirm reservations, dates, and hotel service requests.",
  },
  "doctor visit": {
    icon: "🩺",
    difficulty: "Intermediate",
    description: "Describe symptoms and understand treatment instructions.",
  },
};

function getScenarioMeta(scenario: string): ScenarioMeta {
  return (
    SCENARIO_META[scenario.toLowerCase()] ?? {
      icon: "💬",
      difficulty: "Mixed",
      description: "Practice practical phrases in a realistic conversation setup.",
    }
  );
}

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
      <section className={`theme-panel relative mx-auto w-full max-w-5xl rounded-[2rem] p-6 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
        <p className="theme-kicker text-[11px] font-semibold uppercase tracking-[0.2em]">Session Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{t("scenarios_title")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Pick one real-life context to start your guided practice session.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {t("mode_title")}: <span className="font-semibold text-slate-900">{modeLabel}</span>
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarioOptions.map((scenario) => {
            const meta = getScenarioMeta(scenario);
            return (
              <ScenarioCard
                key={scenario}
                name={scenario}
                icon={meta.icon}
                difficulty={meta.difficulty}
                description={meta.description}
                selected={selectedScenario === scenario}
                onSelect={() => handleSelect(scenario)}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
