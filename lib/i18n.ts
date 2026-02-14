export type UiLanguage = "en" | "ar";

type TranslationKey =
  | "Continue"
  | "App Language"
  | "I want to learn"
  | "English"
  | "Arabic"
  | "Spanish"
  | "Start Test";

const DICTIONARY: Record<UiLanguage, Record<TranslationKey, string>> = {
  en: {
    Continue: "Continue",
    "App Language": "App Language",
    "I want to learn": "I want to learn",
    English: "English",
    Arabic: "Arabic",
    Spanish: "Spanish",
    "Start Test": "Start Test",
  },
  ar: {
    Continue: "متابعة",
    "App Language": "لغة التطبيق",
    "I want to learn": "أريد أن أتعلم",
    English: "الإنجليزية",
    Arabic: "العربية",
    Spanish: "الإسبانية",
    "Start Test": "ابدأ الاختبار",
  },
};

export function t(key: TranslationKey, uiLanguage: UiLanguage): string {
  return DICTIONARY[uiLanguage][key] ?? key;
}

