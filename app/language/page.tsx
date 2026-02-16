"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import SectionHeader from "@/app/components/ui/SectionHeader";
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
      <main className="app-page theme-page">
        <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
        <div className="app-section relative mx-auto w-full max-w-2xl sm:p-8">
          <h1 className="app-title-lg">LinguaSim</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className={`app-section relative mx-auto w-full max-w-2xl sm:p-8 ${isRtl ? "text-right" : "text-left"}`}>
        <SectionHeader
          as="h1"
          align={isRtl ? "right" : "left"}
          kicker="Setup"
          title={t("app_title")}
          description="Choose app language and your target learning language."
        />

        <section className="mt-6">
          <p className="app-kicker">{t("app_language")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`quiz-option focus-ring rounded-xl border px-4 py-3 text-sm font-semibold ${
                lang === "en" ? "quiz-option-selected" : ""
              }`}
            >
              {t("english")}
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`quiz-option focus-ring rounded-xl border px-4 py-3 text-sm font-semibold ${
                lang === "ar" ? "quiz-option-selected" : ""
              }`}
            >
              {t("arabic")}
            </button>
          </div>
        </section>

        <section className="mt-6">
          <p className="app-kicker">{t("learn_language")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {LEARNING_LANGUAGES.map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setTargetLanguage(language)}
                className={`quiz-option focus-ring rounded-xl border px-4 py-3 text-sm font-semibold ${
                  targetLanguage === language ? "quiz-option-selected" : ""
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
          className="btn-glow focus-ring mt-8 px-4 py-2.5 text-sm text-white"
        >
          {t("continue")}
        </button>
      </div>
    </main>
  );
}
