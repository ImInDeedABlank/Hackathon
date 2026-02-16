import { clamp, type PlacementMetrics } from "@/lib/adaptivePlacement";

export type PlacementResult = PlacementMetrics;

function tuple3(value: unknown, fallback: [string, string, string]): [string, string, string] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const safe = value.filter((item): item is string => typeof item === "string").slice(0, 3);
  return safe.length === 3 ? [safe[0], safe[1], safe[2]] : fallback;
}

function tuple2(value: unknown, fallback: [string, string]): [string, string] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const safe = value.filter((item): item is string => typeof item === "string").slice(0, 2);
  return safe.length === 2 ? [safe[0], safe[1]] : fallback;
}

export function normalizePlacementResult(raw: unknown): PlacementResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const feedback = source.feedback && typeof source.feedback === "object" ? (source.feedback as Record<string, unknown>) : {};

  const level = source.level === "Beginner" || source.level === "Intermediate" || source.level === "Advanced"
    ? source.level
    : "Intermediate";
  const cefr =
    source.cefr_hint === "A1" ||
    source.cefr_hint === "A2" ||
    source.cefr_hint === "B1" ||
    source.cefr_hint === "B2" ||
    source.cefr_hint === "C1"
      ? source.cefr_hint
      : "B1";
  const mode = source.recommended_mode === "Speak" ? "Speak" : "Text";

  return {
    level,
    cefr_hint: cefr,
    confidence:
      typeof source.confidence === "number" && Number.isFinite(source.confidence)
        ? clamp(Math.round(source.confidence), 0, 100)
        : 60,
    strengths: tuple3(source.strengths, [
      "Shows clear intent in simple prompts.",
      "Can respond to practical scenarios.",
      "Adapts to mixed question types.",
    ]),
    weaknesses: tuple3(source.weaknesses, [
      "Needs stronger grammar consistency.",
      "Needs wider active vocabulary.",
      "Needs smoother sentence flow.",
    ]),
    feedback: {
      corrected_version:
        typeof feedback.corrected_version === "string"
          ? feedback.corrected_version
          : "Keep your responses short and clear, then add one supporting detail.",
      key_mistakes: tuple3(feedback.key_mistakes, [
        "Verb tense consistency",
        "Article/preposition choices",
        "Sentence order in longer responses",
      ]),
      natural_alternatives: tuple2(feedback.natural_alternatives, [
        "Use one short sentence first, then add one detail.",
        "Reuse high-frequency phrases before complex structures.",
      ]),
      grammar_note:
        typeof feedback.grammar_note === "string"
          ? feedback.grammar_note
          : "Keep one tense per sentence and check subject-verb agreement.",
    },
    recommended_mode: mode,
    recommended_scenarios: tuple2(source.recommended_scenarios, ["Ordering Food", "Hotel Check-in"]),
  };
}
