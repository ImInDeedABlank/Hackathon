"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { STORAGE_KEYS, readString, writeString } from "@/lib/placementStorage";

type SpeakSubMode = "conversation" | "repeat";

type SubModeOption = {
  key: SpeakSubMode;
  icon: string;
  titleKey: "speak_submode_conversation" | "speak_submode_repeat";
  subtitleKey: "speak_submode_conversation_desc" | "speak_submode_repeat_desc";
};

const SUB_MODE_OPTIONS: SubModeOption[] = [
  {
    key: "conversation",
    icon: "🗣️",
    titleKey: "speak_submode_conversation",
    subtitleKey: "speak_submode_conversation_desc",
  },
  {
    key: "repeat",
    icon: "🔁",
    titleKey: "speak_submode_repeat",
    subtitleKey: "speak_submode_repeat_desc",
  },
];

function toSpeakSubMode(value: string): SpeakSubMode {
  return value === "repeat" ? "repeat" : "conversation";
}

export default function SpeakModePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [selectedSubMode, setSelectedSubMode] = useState<SpeakSubMode>(() =>
    toSpeakSubMode(readString(STORAGE_KEYS.speakSubMode, "conversation")),
  );
  const isRtl = lang === "ar";

  const handleContinue = () => {
    writeString(STORAGE_KEYS.selectedMode, "Speak");
    writeString(STORAGE_KEYS.speakSubMode, selectedSubMode);
    router.push("/speak-scenarios");
  };

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto w-full max-w-4xl">
        <section
          className={`app-section motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}
        >
          <SectionHeader
            as="h1"
            align={isRtl ? "right" : "left"}
            kicker={t("speak_mode")}
            title={t("speak_submode_title")}
            description={t("speak_submode_hint")}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SUB_MODE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedSubMode(option.key)}
                className={`choice-card focus-ring w-full rounded-2xl p-6 shadow-sm sm:p-7 ${selectedSubMode === option.key ? "choice-card-selected" : ""} ${isRtl ? "text-right" : "text-left"}`}
                aria-pressed={selectedSubMode === option.key}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {option.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-[color:var(--text-strong)]">{t(option.titleKey)}</h2>
                    <p className="app-muted mt-1 text-sm">{t(option.subtitleKey)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className={`mt-6 flex flex-col gap-3 sm:flex-row ${isRtl ? "sm:justify-start" : "sm:justify-end"}`}>
            <button
              type="button"
              onClick={() => router.push("/mode")}
              className="btn-outline focus-ring px-4 py-2.5 text-sm"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="btn-glow focus-ring px-4 py-2.5 text-sm"
            >
              {t("continue_to_scenarios")}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
