"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { t, type UiLanguage } from "@/lib/i18n";
import { STORAGE_KEYS, readString, writeString } from "@/lib/placementStorage";

type LearningLanguage = "English" | "Arabic" | "Spanish";

const LEARNING_LANGUAGES: LearningLanguage[] = ["English", "Arabic", "Spanish"];

function applyLanguage(uiLanguage: UiLanguage) {
  const root = document.documentElement;
  const isArabic = uiLanguage === "ar";
  root.lang = isArabic ? "ar" : "en";
  root.dir = isArabic ? "rtl" : "ltr";
}

export default function LanguagePage() {
  const router = useRouter();
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>(() => (readString(STORAGE_KEYS.uiLanguage, "en") === "ar" ? "ar" : "en"));
  const [targetLanguage, setTargetLanguage] = useState<LearningLanguage>(() => {
    const saved = readString(STORAGE_KEYS.targetLanguage, "English");
    return saved === "Arabic" || saved === "Spanish" ? saved : "English";
  });

  const handleUiLanguageChange = (nextLanguage: UiLanguage) => {
    setUiLanguage(nextLanguage);
    writeString(STORAGE_KEYS.uiLanguage, nextLanguage);
    applyLanguage(nextLanguage);
  };

  const handleContinue = () => {
    writeString(STORAGE_KEYS.uiLanguage, uiLanguage);
    writeString(STORAGE_KEYS.targetLanguage, targetLanguage);
    router.push("/quiz");
  };

  const rtl = uiLanguage === "ar";

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className={`theme-panel relative mx-auto w-full max-w-2xl rounded-2xl p-6 backdrop-blur sm:p-8 ${rtl ? "text-right" : "text-left"}`}>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">LinguaSim</h1>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("App Language", uiLanguage)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleUiLanguageChange("en")}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                uiLanguage === "en" ? "quiz-option-selected" : "quiz-option"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleUiLanguageChange("ar")}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                uiLanguage === "ar" ? "quiz-option-selected" : "quiz-option"
              }`}
            >
              العربية
            </button>
          </div>
        </section>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("I want to learn", uiLanguage)}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {LEARNING_LANGUAGES.map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setTargetLanguage(language)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  targetLanguage === language ? "quiz-option-selected" : "quiz-option"
                }`}
              >
                {t(language, uiLanguage)}
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={handleContinue}
          className="btn-glow mt-8 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          {t("Continue", uiLanguage)}
        </button>
      </div>
    </main>
  );
}

