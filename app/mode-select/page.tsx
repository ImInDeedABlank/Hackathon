"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ModeCard from "@/app/components/ModeCard";
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
    router.push("/scenarios");
  };

  const isRtl = lang === "ar";

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto w-full max-w-4xl">
        <section className={`theme-panel rounded-2xl p-6 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Practice Setup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("mode_title")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("choose_mode_hint")}</p>

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
              className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("continue_to_scenarios")}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
