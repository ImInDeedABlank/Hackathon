"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { STORAGE_KEYS, readString, writeString } from "@/lib/placementStorage";

type LearningLanguage = "English" | "Arabic" | "Spanish";

const LEARNING_LANGUAGES: LearningLanguage[] = ["English", "Arabic", "Spanish"];

export default function LanguagePage() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [targetLanguage, setTargetLanguage] = useState<LearningLanguage>(() => {
    const saved = readString(STORAGE_KEYS.targetLanguage, "English");
    return saved === "Arabic" || saved === "Spanish" ? saved : "English";
  });

  const handleContinue = () => {
    writeString(STORAGE_KEYS.uiLanguage, lang);
    writeString(STORAGE_KEYS.targetLanguage, targetLanguage);
    router.push("/main");
  };

  const isRtl = isHydrated && lang === "ar";

  if (!isHydrated) {
    return (
      <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
        <div className="theme-panel relative mx-auto w-full max-w-2xl rounded-2xl p-6 backdrop-blur sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">LinguaSim</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className={`theme-panel relative mx-auto w-full max-w-2xl rounded-2xl p-6 backdrop-blur sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("app_title")}</h1>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("app_language")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                lang === "en" ? "quiz-option-selected" : "quiz-option"
              }`}
            >
              {t("english")}
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                lang === "ar" ? "quiz-option-selected" : "quiz-option"
              }`}
            >
              {t("arabic")}
            </button>
          </div>
        </section>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("learn_language")}</p>
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
                {t(language.toLowerCase())}
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={handleContinue}
          className="btn-glow mt-8 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          {t("continue")}
        </button>
      </div>
    </main>
  );
}
