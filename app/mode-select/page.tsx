"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ModeCard from "@/app/components/ModeCard";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { STORAGE_KEYS, readString, writeString } from "@/lib/placementStorage";

type ModeOption = {
  key: "Text" | "Speak";
  icon: string;
  titleKey: string;
  subtitle: string;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    key: "Speak",
    icon: "🎤",
    titleKey: "speak_mode",
    subtitle: "Speaking and listening practice.",
  },
  {
    key: "Text",
    icon: "💬",
    titleKey: "text_mode",
    subtitle: "Reading and writing practice.",
  },
];

export default function ModeSelectPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<"Text" | "Speak">(() => {
    const saved = readString(STORAGE_KEYS.selectedMode, "Text");
    return saved === "Speak" ? "Speak" : "Text";
  });

  const handleContinue = () => {
    writeString(STORAGE_KEYS.selectedMode, selectedMode);
    if (selectedMode === "Speak") {
      router.push("/speak-mode");
      return;
    }
    router.push("/scenarios");
  };

  const isRtl = lang === "ar";

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto w-full max-w-4xl">
        <section className={`app-section motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
          <SectionHeader
            as="h1"
            align={isRtl ? "right" : "left"}
            kicker="Practice Setup"
            title={t("mode_title")}
            description={t("choose_mode_hint")}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {MODE_OPTIONS.map((mode) => (
              <ModeCard
                key={mode.key}
                icon={mode.icon}
                title={t(mode.titleKey)}
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
              className="btn-glow focus-ring px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedMode === "Speak" ? t("continue") : t("continue_to_scenarios")}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
