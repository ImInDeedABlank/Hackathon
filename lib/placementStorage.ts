import type { PlacementResult } from "@/lib/placement";

export const STORAGE_KEYS = {
  uiLanguage: "uiLanguage",
  targetLanguage: "targetLanguage",
  vocabScore: "linguasim.vocabScore",
  grammarScore: "linguasim.grammarScore",
  writingSample: "linguasim.writingSample",
  placementResult: "linguasim.placementResult",
  selectedMode: "linguasim.selectedMode",
  selectedScenario: "linguasim.selectedScenario",
  sessionExchanges: "linguasim.sessionExchanges",
} as const;

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

export function clearPlacementStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}
