"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ScenarioCard from "@/app/components/ScenarioCard";
import SectionHeader from "@/app/components/ui/SectionHeader";
import {
  STORAGE_KEYS,
  readPlacementResult,
  writeNumber,
  writeSessionTurns,
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
    icon: "\uD83D\uDED2",
    difficulty: "Beginner",
    description: "Ask for prices, quantities, and common grocery items.",
  },
  "asking for directions": {
    icon: "\uD83E\uDDED",
    difficulty: "Beginner",
    description: "Practice navigation questions and location phrases.",
  },
  airport: {
    icon: "\u2708\uFE0F",
    difficulty: "Intermediate",
    description: "Handle check-in, boarding, and baggage follow-up questions.",
  },
  "ordering food": {
    icon: "\uD83C\uDF7D\uFE0F",
    difficulty: "Beginner",
    description: "Order meals clearly and ask for menu recommendations.",
  },
  "job interview": {
    icon: "\uD83D\uDCBC",
    difficulty: "Advanced",
    description: "Answer professional questions with clear, confident language.",
  },
  "hotel check-in": {
    icon: "\uD83C\uDFE8",
    difficulty: "Intermediate",
    description: "Confirm reservations, dates, and hotel service requests.",
  },
  "doctor visit": {
    icon: "\uD83E\uDE7A",
    difficulty: "Intermediate",
    description: "Describe symptoms and understand treatment instructions.",
  },
};

function getScenarioMeta(scenario: string): ScenarioMeta {
  return (
    SCENARIO_META[scenario.toLowerCase()] ?? {
      icon: "\uD83D\uDCAC",
      difficulty: "Mixed",
      description: "Practice practical phrases in a realistic conversation setup.",
    }
  );
}

export default function SpeakScenariosPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [recommendedScenarios] = useState(() => readPlacementResult()?.recommended_scenarios ?? []);

  const scenarioOptions = useMemo(() => {
    const merged = [...recommendedScenarios, ...DEFAULT_SCENARIOS];
    return Array.from(new Set(merged)).slice(0, 6);
  }, [recommendedScenarios]);

  const handleSelect = (scenario: string) => {
    setSelectedScenario(scenario);
    writeString(STORAGE_KEYS.selectedMode, "Speak");
    writeString(STORAGE_KEYS.speakSelectedScenario, scenario);
    writeNumber(STORAGE_KEYS.sessionExchanges, 0);
    writeSessionTurns([]);
    router.push("/chat");
  };

  const isRtl = lang === "ar";

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <section className={`app-section relative mx-auto w-full max-w-5xl motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
        <SectionHeader
          as="h1"
          align={isRtl ? "right" : "left"}
          kicker="Session Setup"
          title={t("scenarios_title")}
          description="Choose one real-life context to start your guided speaking session."
        />
        <p className="app-body app-muted mt-2 text-sm">
          {t("mode_title")}: <span className="font-semibold text-[color:var(--text-strong)]">{t("speak_mode")}</span>
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
