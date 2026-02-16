import "server-only";

import { clamp } from "@/lib/adaptivePlacement";
import type {
  CEFRLevel,
  LearningVideoLanguage,
  LearningVideosRequestBody,
  NormalizedPlacementProfile,
  PlacementBand,
  PlacementSkillScoresInput,
  UILanguageCode,
} from "@/types/learningVideos";

function toUiLanguage(value: unknown): UILanguageCode {
  return value === "ar" ? "ar" : "en";
}

function toLanguage(value: unknown): LearningVideoLanguage {
  if (value === "Arabic" || value === "Spanish") {
    return value;
  }
  return "English";
}

function toCefr(value: unknown): CEFRLevel | null {
  if (value === "A1" || value === "A2" || value === "B1" || value === "B2" || value === "C1") {
    return value;
  }
  return null;
}

function toBand(value: unknown): PlacementBand | null {
  if (value === "Beginner" || value === "Intermediate" || value === "Advanced") {
    return value;
  }
  return null;
}

function asTuple3(value: unknown, fallback: [string, string, string]): [string, string, string] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const safe = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3);
  return safe.length === 3 ? [safe[0], safe[1], safe[2]] : fallback;
}

function bandFromCefr(level: CEFRLevel): PlacementBand {
  if (level === "B2" || level === "C1") {
    return "Advanced";
  }
  if (level === "B1") {
    return "Intermediate";
  }
  return "Beginner";
}

function cefrFromBand(level: PlacementBand): CEFRLevel {
  if (level === "Advanced") {
    return "B2";
  }
  if (level === "Intermediate") {
    return "B1";
  }
  return "A2";
}

function languageCodeFor(value: LearningVideoLanguage): "en" | "ar" | "es" {
  if (value === "Arabic") {
    return "ar";
  }
  if (value === "Spanish") {
    return "es";
  }
  return "en";
}

function averageSkillScore(skillScores: PlacementSkillScoresInput | undefined): number | null {
  if (!skillScores || typeof skillScores !== "object") {
    return null;
  }
  const values = [
    typeof skillScores.vocab === "number" ? skillScores.vocab : null,
    typeof skillScores.grammar === "number" ? skillScores.grammar : null,
    typeof skillScores.reading === "number" ? skillScores.reading : null,
    typeof skillScores.writing === "number" ? skillScores.writing : null,
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return clamp(Math.round(avg), 0, 100);
}

function defaultStrengths(level: PlacementBand): [string, string, string] {
  if (level === "Advanced") {
    return [
      "Handles nuanced explanations with clear structure.",
      "Maintains vocabulary variety in functional contexts.",
      "Connects ideas with strong cohesion in responses.",
    ];
  }
  if (level === "Intermediate") {
    return [
      "Can express core ideas in everyday situations.",
      "Understands common conversational patterns.",
      "Adapts to mixed question formats with reasonable control.",
    ];
  }
  return [
    "Can communicate basic needs with simple phrases.",
    "Recognizes high-frequency words and expressions.",
    "Builds short responses with clear intent.",
  ];
}

function defaultWeaknesses(level: PlacementBand): [string, string, string] {
  if (level === "Advanced") {
    return [
      "Needs more precision in advanced collocations.",
      "Can improve consistency under time pressure.",
      "Needs tighter control of register for formal settings.",
    ];
  }
  if (level === "Intermediate") {
    return [
      "Needs stronger grammar consistency in longer turns.",
      "Needs broader vocabulary for topic-specific discussion.",
      "Needs smoother transitions between ideas.",
    ];
  }
  return [
    "Needs stronger sentence patterns and tense consistency.",
    "Needs broader basic vocabulary for daily tasks.",
    "Needs more confidence with listening and follow-up responses.",
  ];
}

function defaultScore(level: PlacementBand): number {
  if (level === "Advanced") {
    return 78;
  }
  if (level === "Intermediate") {
    return 56;
  }
  return 34;
}

export function normalizePlacementProfile(raw: LearningVideosRequestBody): NormalizedPlacementProfile {
  const selectedLanguage = toLanguage(raw.selectedLanguage ?? raw.targetLanguage);
  const placement = raw.placement ?? null;
  const hasPlacementObject = !!placement && typeof placement === "object";

  const explicitBand = hasPlacementObject ? toBand(placement.level) : null;
  const explicitCefr = hasPlacementObject ? toCefr(placement.cefrLevel ?? placement.cefr_hint) : null;

  const level = explicitBand ?? (explicitCefr ? bandFromCefr(explicitCefr) : "Intermediate");
  const cefrLevel = explicitCefr ?? cefrFromBand(level);

  const confidence =
    hasPlacementObject && typeof placement.confidence === "number" && Number.isFinite(placement.confidence)
      ? clamp(Math.round(placement.confidence), 0, 100)
      : 50;

  const scoreFromPayload =
    hasPlacementObject && typeof placement.numericScore === "number" && Number.isFinite(placement.numericScore)
      ? clamp(Math.round(placement.numericScore), 0, 100)
      : null;
  const scoreFromSummary = hasPlacementObject ? averageSkillScore(placement.summary?.skillScores) : null;
  const numericScore = scoreFromPayload ?? scoreFromSummary ?? defaultScore(level);

  const completed = hasPlacementObject && (explicitBand !== null || explicitCefr !== null);

  const strengths =
    hasPlacementObject && placement.strengths
      ? asTuple3(placement.strengths, defaultStrengths(level))
      : defaultStrengths(level);
  const weaknesses =
    hasPlacementObject && placement.weaknesses
      ? asTuple3(placement.weaknesses, defaultWeaknesses(level))
      : defaultWeaknesses(level);

  return {
    userId:
      typeof raw.userId === "string" && raw.userId.trim().length > 0
        ? raw.userId.trim().slice(0, 80)
        : "anon",
    uiLanguage: toUiLanguage(raw.uiLanguage),
    selectedLanguage,
    selectedLanguageCode: languageCodeFor(selectedLanguage),
    completed,
    level,
    cefrLevel,
    numericScore,
    confidence,
    strengths,
    weaknesses,
  };
}

