import type { PlacementResult } from "@/lib/placement";
import type { PlacementSummary } from "@/lib/adaptivePlacement";
import type { SessionTurn } from "@/lib/validate";

export type PlacementMeta = {
  focus_areas: [string, string, string];
  summary: PlacementSummary;
};

export const STORAGE_KEYS = {
  uiLanguage: "uiLanguage",
  targetLanguage: "targetLanguage",
  vocabScore: "linguasim.vocabScore",
  grammarScore: "linguasim.grammarScore",
  writingSample: "linguasim.writingSample",
  placementResult: "linguasim.placementResult",
  placementMeta: "linguasim.placementMeta",
  selectedMode: "linguasim.selectedMode",
  speakSubMode: "linguasim.speakSubMode",
  selectedScenario: "linguasim.selectedScenario",
  speakSelectedScenario: "linguasim.speakSelectedScenario",
  sessionExchanges: "linguasim.sessionExchanges",
  sessionTurns: "linguasim.sessionTurns",
} as const;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSessionTurn(value: unknown): value is SessionTurn {
  if (!value || typeof value !== "object") {
    return false;
  }
  const source = value as Record<string, unknown>;
  const feedback = source.feedback;
  if (!feedback || typeof feedback !== "object") {
    return false;
  }
  const feedbackSource = feedback as Record<string, unknown>;
  return (
    typeof source.user === "string" &&
    typeof source.ai === "string" &&
    typeof source.score === "number" &&
    Number.isFinite(source.score) &&
    typeof feedbackSource.user_original === "string" &&
    typeof feedbackSource.corrected_version === "string" &&
    typeof feedbackSource.grammar_note === "string" &&
    typeof feedbackSource.improvement_tip === "string" &&
    isStringArray(feedbackSource.key_mistakes) &&
    isStringArray(feedbackSource.natural_alternatives)
  );
}

export function readNumber(key: string, fallback = 0): number {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

export function readString(key: string, fallback = ""): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) ?? fallback;
}

export function writeString(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value);
}

export function writeNumber(key: string, value: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, String(value));
}

export function writeSessionTurns(turns: SessionTurn[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.sessionTurns, JSON.stringify(turns));
}

export function readSessionTurns(): SessionTurn[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEYS.sessionTurns);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is SessionTurn => isSessionTurn(item));
  } catch {
    return [];
  }
}

export function writePlacementResult(result: PlacementResult): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.placementResult, JSON.stringify(result));
}

export function readPlacementResult(): PlacementResult | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEYS.placementResult);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PlacementResult;
  } catch {
    return null;
  }
}

export function writePlacementMeta(meta: PlacementMeta): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.placementMeta, JSON.stringify(meta));
}

export function readPlacementMeta(): PlacementMeta | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEYS.placementMeta);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PlacementMeta;
  } catch {
    return null;
  }
}

export function clearPlacementStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}
