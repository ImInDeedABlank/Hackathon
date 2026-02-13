import { PLACEMENT_SYSTEM_PROMPT } from "@/lib/prompts";

export type PlacementResult = {
  level: "Beginner" | "Intermediate" | "Advanced";
  cefr_hint: "A1" | "A2" | "B1" | "B2" | "C1";
  confidence: number;
  strengths: [string, string, string];
  weaknesses: [string, string, string];
  feedback: {
    corrected_version: string;
    key_mistakes: [string, string, string];
    natural_alternatives: [string, string];
  };
  recommended_mode: "Speak" | "Text";
  recommended_scenarios: [string, string];
};

export type PlacementInput = {
  targetLanguage: string;
  vocabScore: number;
  grammarScore: number;
  writingSample: string;
};

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

function asTuple3(values: unknown, fallback: [string, string, string]): [string, string, string] {
  if (!Array.isArray(values)) {
    return fallback;
  }
  const safe = values.filter((item): item is string => typeof item === "string").slice(0, 3);
  if (safe.length < 3) {
    return fallback;
  }
  return [safe[0], safe[1], safe[2]];
}

function asTuple2(values: unknown, fallback: [string, string]): [string, string] {
  if (!Array.isArray(values)) {
    return fallback;
  }
  const safe = values.filter((item): item is string => typeof item === "string").slice(0, 2);
  if (safe.length < 2) {
    return fallback;
  }
  return [safe[0], safe[1]];
}

function normalizePlacementResult(raw: unknown): PlacementResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const feedback = source.feedback as Record<string, unknown> | undefined;

  const level = source.level;
  const cefr = source.cefr_hint;
  const mode = source.recommended_mode;
  const confidence = source.confidence;

  return {
    level:
      level === "Beginner" || level === "Intermediate" || level === "Advanced"
        ? level
        : "Beginner",
    cefr_hint: cefr === "A1" || cefr === "A2" || cefr === "B1" || cefr === "B2" || cefr === "C1" ? cefr : "A1",
    confidence:
      typeof confidence === "number" && Number.isFinite(confidence)
        ? Math.max(0, Math.min(100, Math.round(confidence)))
        : 65,
    strengths: asTuple3(source.strengths, [
      "Shows basic intent clearly",
      "Can produce short connected ideas",
      "Attempts target-language structure",
    ]),
    weaknesses: asTuple3(source.weaknesses, [
      "Inconsistent grammar agreement",
      "Limited vocabulary precision",
      "Sentence flow needs smoothing",
    ]),
    feedback: {
      corrected_version:
        feedback && typeof feedback.corrected_version === "string"
          ? feedback.corrected_version
          : "Thanks for your writing sample. Keep practicing full sentences with clear connectors.",
      key_mistakes: asTuple3(feedback?.key_mistakes, [
        "Verb tense consistency",
        "Article or preposition usage",
        "Word order in longer clauses",
      ]),
      natural_alternatives: asTuple2(feedback?.natural_alternatives, [
        "Use shorter clauses before combining ideas.",
        "Replace literal translations with common phrases.",
      ]),
    },
    recommended_mode: mode === "Speak" || mode === "Text" ? mode : "Text",
    recommended_scenarios: asTuple2(source.recommended_scenarios, [
      "Ordering at a cafe",
      "Introducing yourself at work",
    ]),
  };
}

function buildMockResult(input: PlacementInput): PlacementResult {
  const total = input.vocabScore + input.grammarScore;
  if (total >= 4) {
    return {
      level: "Advanced",
      cefr_hint: "B2",
      confidence: 84,
      strengths: [
        "Strong control of core grammar",
        "Good lexical precision for common contexts",
        "Clear and coherent sentence structure",
      ],
      weaknesses: [
        "Occasional collocation choices feel literal",
        "Could vary connectors for smoother flow",
        "Needs more idiomatic phrasing in nuance",
      ],
      feedback: {
        corrected_version: input.writingSample.trim() || "Your writing sample looks strong overall.",
        key_mistakes: [
          "Natural collocations in longer phrases",
          "Register consistency across sentences",
          "Fine-grained article/preposition choices",
        ],
        natural_alternatives: [
          "Try replacing direct translations with idiomatic phrases.",
          "Use transition words to connect ideas naturally.",
        ],
      },
      recommended_mode: "Speak",
      recommended_scenarios: ["Job interview warm-up", "Resolving a delivery issue"],
    };
  }

  if (total >= 2) {
    return {
      level: "Intermediate",
      cefr_hint: "B1",
      confidence: 76,
      strengths: [
        "Communicates core meaning effectively",
        "Uses simple grammar structures reliably",
        "Attempts detail beyond single-clause answers",
      ],
      weaknesses: [
        "Verb tense consistency needs attention",
        "Word choice can be repetitive",
        "Sentence linking is sometimes abrupt",
      ],
      feedback: {
        corrected_version:
          input.writingSample.trim() || "I practice every day to speak more clearly in real conversations.",
        key_mistakes: [
          "Verb form and tense alignment",
          "Articles and preposition choices",
          "Word order in longer sentences",
        ],
        natural_alternatives: [
          "Use one clear idea per sentence first.",
          "Then combine ideas with simple connectors.",
        ],
      },
      recommended_mode: "Text",
      recommended_scenarios: ["Checking into a hotel", "Making weekend plans"],
    };
  }

  return {
    level: "Beginner",
    cefr_hint: "A2",
    confidence: 68,
    strengths: [
      "Can express basic personal information",
      "Attempts complete short sentences",
      "Shows willingness to use target language",
    ],
    weaknesses: [
      "Frequent grammar agreement errors",
      "Limited range of high-frequency vocabulary",
      "Message clarity drops in longer sentences",
    ],
    feedback: {
      corrected_version:
        input.writingSample.trim() ||
        "I am learning every day, and I want to speak with more confidence.",
      key_mistakes: [
        "Subject-verb agreement",
        "Basic tense and article use",
        "Simple sentence order",
      ],
      natural_alternatives: [
        "Use short present-tense sentences first.",
        "Practice common phrases for daily routines.",
      ],
    },
    recommended_mode: "Text",
    recommended_scenarios: ["Buying groceries", "Asking for directions"],
  };
}

export function buildPlacementUserMessage(input: PlacementInput): string {
  return [
    `Target language: ${input.targetLanguage}`,
    `MCQ summary: vocabScore ${input.vocabScore}/2, grammarScore ${input.grammarScore}/2`,
    "Writing sample:",
    input.writingSample.trim(),
  ].join("\n");
}

export async function getPlacementResult(input: PlacementInput): Promise<PlacementResult> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    return buildMockResult(input);
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PLACEMENT_SYSTEM_PROMPT },
          { role: "user", content: buildPlacementUserMessage(input) },
        ],
      }),
    });

    if (!response.ok) {
      return buildMockResult(input);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return buildMockResult(input);
    }

    const parsed = JSON.parse(content) as unknown;
    return normalizePlacementResult(parsed);
  } catch {
    return buildMockResult(input);
  }
}
