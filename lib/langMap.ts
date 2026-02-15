export type SupportedTargetLanguage = "English" | "Arabic" | "Spanish";

type LanguageTags = {
  stt: string;
  tts: string;
  voicePrefix: "en" | "ar" | "es";
};

const LANGUAGE_TAGS: Record<SupportedTargetLanguage, LanguageTags> = {
  English: {
    stt: "en-US",
    tts: "en-US",
    voicePrefix: "en",
  },
  Arabic: {
    stt: "ar-SA",
    tts: "ar-SA",
    voicePrefix: "ar",
  },
  Spanish: {
    stt: "es-ES",
    tts: "es-ES",
    voicePrefix: "es",
  },
};

function toSupportedTargetLanguage(value: string): SupportedTargetLanguage {
  if (value === "Arabic" || value === "Spanish") {
    return value;
  }
  return "English";
}

export function getSpeechRecognitionLang(targetLanguage: string): string {
  return LANGUAGE_TAGS[toSupportedTargetLanguage(targetLanguage)].stt;
}

export function getSpeechSynthesisLang(targetLanguage: string): string {
  return LANGUAGE_TAGS[toSupportedTargetLanguage(targetLanguage)].tts;
}

export function getSpeechVoicePrefix(targetLanguage: string): "en" | "ar" | "es" {
  return LANGUAGE_TAGS[toSupportedTargetLanguage(targetLanguage)].voicePrefix;
}
