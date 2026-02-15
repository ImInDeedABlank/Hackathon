"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
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
    router.push("/chat");
  };

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <div className="relative mx-auto w-full max-w-4xl">
        <section
          className={`theme-panel rounded-2xl p-6 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-8 ${isRtl ? "text-right" : "text-left"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("speak_mode")}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("speak_submode_title")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("speak_submode_hint")}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SUB_MODE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedSubMode(option.key)}
                className={`choice-card w-full rounded-2xl p-6 shadow-sm transition sm:p-7 ${selectedSubMode === option.key ? "choice-card-selected" : ""} ${isRtl ? "text-right" : "text-left"}`}
                aria-pressed={selectedSubMode === option.key}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {option.icon}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{t(option.titleKey)}</h2>
                    <p className="mt-1 text-sm text-slate-600">{t(option.subtitleKey)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className={`mt-6 flex flex-col gap-3 sm:flex-row ${isRtl ? "sm:justify-start" : "sm:justify-end"}`}>
            <button
              type="button"
              onClick={() => router.push("/mode")}
              className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              {t("continue_to_chat")}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
