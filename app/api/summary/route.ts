import { NextResponse } from "next/server";

import { callGeminiText } from "@/lib/geminiClient";
import type { SessionTurn } from "@/lib/validate";

type UILanguage = "en" | "ar";
type TargetLanguage = "English" | "Arabic" | "Spanish";
type Mode = "Text" | "Speak";

type SummaryInput = {
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  scenario: string;
  mode: Mode;
  turns: SessionTurn[];
};

type SummaryOutput = {
  finalScore: number;
  overallReview: string;
  strengths: string[];
  weaknesses: string[];
  focusAreas: string[];
  nextSteps: string[];
};

const TARGET_LANGUAGES: TargetLanguage[] = ["English", "Arabic", "Spanish"];
const MODES: Mode[] = ["Text", "Speak"];

const FALLBACK_TEXT = {
  en: {
    noTurns: "No completed turns were found for this session.",
    fallbackReview: "Summary fallback generated because AI summary was unavailable.",
    strengths: [
      "You completed this practice session.",
      "You stayed engaged with the scenario.",
      "You collected turn-level feedback.",
    ],
    weaknesses: [
      "Some responses still need grammar refinement.",
      "Some phrasing can be more natural.",
      "Some answers need clearer structure.",
    ],
    focusAreas: [
      "Grammar consistency",
      "Natural phrasing",
      "Scenario fluency",
    ],
    nextSteps: [
      "Retry the scenario and target higher turn scores.",
      "Use corrected versions before your next send.",
      "Practice short sessions daily.",
    ],
  },
  ar: {
    noTurns: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0648\u0644\u0627\u062A \u0645\u0643\u062A\u0645\u0644\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u062C\u0644\u0633\u0629.",
    fallbackReview: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u062E\u0635 \u0628\u062F\u064A\u0644 \u0644\u0623\u0646 \u0627\u0644\u062E\u062F\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627.",
    strengths: [
      "\u0623\u0643\u0645\u0644\u062A \u062C\u0644\u0633\u0629 \u062A\u062F\u0631\u064A\u0628.",
      "\u062D\u0635\u0644\u062A \u0639\u0644\u0649 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0644\u0643\u0644 \u062C\u0648\u0644\u0629.",
      "\u062D\u0627\u0641\u0638\u062A \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631\u064A\u0629 \u0641\u064A \u0627\u0644\u062A\u062F\u0631\u064A\u0628.",
    ],
    weaknesses: [
      "\u0645\u0627 \u0632\u0627\u0644\u062A \u0628\u0639\u0636 \u0627\u0644\u0631\u062F\u0648\u062F \u062A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646\u0627 \u0646\u062D\u0648\u064A\u0627.",
      "\u0628\u0639\u0636 \u0627\u0644\u0635\u064A\u0627\u063A\u0627\u062A \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0623\u0643\u062B\u0631 \u0637\u0628\u064A\u0639\u064A\u0629.",
      "\u062A\u062D\u062A\u0627\u062C \u0628\u0639\u0636 \u0627\u0644\u0631\u062F\u0648\u062F \u0625\u0644\u0649 \u0648\u0636\u0648\u062D \u0623\u0643\u0628\u0631.",
    ],
    focusAreas: [
      "\u0627\u062A\u0633\u0627\u0642 \u0627\u0644\u0642\u0648\u0627\u0639\u062F",
      "\u0635\u064A\u0627\u063A\u0629 \u0637\u0628\u064A\u0639\u064A\u0629",
      "\u0637\u0644\u0627\u0642\u0629 \u0627\u0644\u0633\u064A\u0646\u0627\u0631\u064A\u0648",
    ],
    nextSteps: [
      "\u0623\u0639\u062F \u0627\u0644\u0633\u064A\u0646\u0627\u0631\u064A\u0648 \u0646\u0641\u0633\u0647 \u0648\u0627\u0633\u062A\u0647\u062F\u0641 \u062F\u0631\u062C\u0627\u062A \u0623\u0639\u0644\u0649.",
      "\u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0645\u0635\u062D\u062D\u0629 \u0642\u0628\u0644 \u0627\u0644\u0631\u062F \u0627\u0644\u062A\u0627\u0644\u064A.",
      "\u062A\u062F\u0631\u0628 \u064A\u0648\u0645\u064A\u0627 \u0628\u062C\u0644\u0633\u0627\u062A \u0642\u0635\u064A\u0631\u0629.",
    ],
  },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toUiLanguage(value: unknown): UILanguage {
  return value === "ar" ? "ar" : "en";
}

function toTargetLanguage(value: unknown): TargetLanguage {
  if (typeof value === "string" && TARGET_LANGUAGES.includes(value as TargetLanguage)) {
    return value as TargetLanguage;
  }
  return "English";
}

function toMode(value: unknown): Mode {
  if (typeof value === "string" && MODES.includes(value as Mode)) {
    return value as Mode;
  }
  return "Text";
}

function toScenario(value: unknown): string {
  if (typeof value !== "string") {
    return "Ordering Food";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "Ordering Food";
}

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

function toTurns(value: unknown): SessionTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is SessionTurn => isSessionTurn(item)).slice(-30);
}

function parseSummaryInput(raw: unknown): SummaryInput {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    uiLanguage: toUiLanguage(source.uiLanguage),
    targetLanguage: toTargetLanguage(source.targetLanguage),
    scenario: toScenario(source.scenario),
    mode: toMode(source.mode),
    turns: toTurns(source.turns),
  };
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch?.[1] ? fencedMatch[1].trim() : trimmed;
}

function parseJsonText(text: string): unknown | null {
  const stripped = stripJsonFences(text);
  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    return null;
  }
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : fallback;
}

function fallbackScoreFromTurns(turns: SessionTurn[]): number {
  if (turns.length === 0) {
    return 0;
  }
  const avg = turns.reduce((sum, turn) => sum + clamp(turn.score, 0, 10), 0) / turns.length;
  return clamp(Math.round(avg * 10), 0, 100);
}

function buildFallbackSummary(input: SummaryInput): SummaryOutput {
  const ui = FALLBACK_TEXT[input.uiLanguage];
  const finalScore = fallbackScoreFromTurns(input.turns);

  return {
    finalScore,
    overallReview: input.turns.length === 0 ? ui.noTurns : ui.fallbackReview,
    strengths: [...ui.strengths],
    weaknesses: [...ui.weaknesses],
    focusAreas: [...ui.focusAreas],
    nextSteps: [...ui.nextSteps],
  };
}

function normalizeSummaryOutput(raw: unknown, input: SummaryInput): SummaryOutput | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const fallback = buildFallbackSummary(input);

  const finalScore =
    typeof source.finalScore === "number" && Number.isFinite(source.finalScore)
      ? clamp(Math.round(source.finalScore), 0, 100)
      : fallback.finalScore;

  const overallReview =
    typeof source.overallReview === "string" && source.overallReview.trim().length > 0
      ? source.overallReview.trim()
      : fallback.overallReview;

  const normalized: SummaryOutput = {
    finalScore,
    overallReview,
    strengths: normalizeStringList(source.strengths, fallback.strengths),
    weaknesses: normalizeStringList(source.weaknesses, fallback.weaknesses),
    focusAreas: normalizeStringList(source.focusAreas, fallback.focusAreas),
    nextSteps: normalizeStringList(source.nextSteps, fallback.nextSteps),
  };

  return normalized;
}

function buildSummarySystemPrompt(uiLanguage: UILanguage): string {
  const languageName = uiLanguage === "ar" ? "Arabic" : "English";

  return [
    "You are LinguaSim session review coach.",
    `All output text MUST be in ${languageName}.`,
    "Return only valid JSON with no markdown and no extra keys.",
    "JSON schema:",
    '{"finalScore": number, "overallReview": string, "strengths": string[], "weaknesses": string[], "focusAreas": string[], "nextSteps": string[]}',
    "finalScore must be AI-driven from turns and turn scores (0-100).",
  ].join("\n");
}

function buildSummaryUserPrompt(input: SummaryInput): string {
  const uiLanguageName = input.uiLanguage === "ar" ? "Arabic" : "English";

  return [
    `UI_LANGUAGE: ${uiLanguageName}`,
    `TARGET_LANGUAGE: ${input.targetLanguage}`,
    `SCENARIO: ${input.scenario}`,
    `MODE: ${input.mode}`,
    "TURNS_JSON:",
    JSON.stringify(input.turns),
    "",
    "Task:",
    "- Analyze each turn and score trend.",
    "- Write all summary text in UI_LANGUAGE only.",
    "- finalScore must reflect turns and per-turn scores.",
    'Return JSON only with keys: finalScore, overallReview, strengths, weaknesses, focusAreas, nextSteps.',
  ].join("\n");
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseSummaryInput(payload);
  const fallback = buildFallbackSummary(input);

  const systemPrompt = buildSummarySystemPrompt(input.uiLanguage);
  const baseUserPrompt = buildSummaryUserPrompt(input);

  const prompts = [
    baseUserPrompt,
    `${baseUserPrompt}\n\nReturn JSON only. No markdown.`,
  ];

  for (let attempt = 0; attempt < prompts.length; attempt += 1) {
    const modelResult = await callGeminiText({
      routeTag: "api/summary",
      systemPrompt,
      userPrompt: prompts[attempt],
      maxOutputTokens: 1200,
    });

    if (!modelResult.ok) {
      if (
        modelResult.reason === "missing_key" ||
        modelResult.reason === "network_error" ||
        modelResult.reason === "http_error"
      ) {
        break;
      }
      continue;
    }

    const parsed = parseJsonText(modelResult.text);
    if (parsed === null) {
      continue;
    }

    const normalized = normalizeSummaryOutput(parsed, input);
    if (normalized) {
      return NextResponse.json(normalized);
    }
  }

  return NextResponse.json(fallback);
}

