import { NextResponse } from "next/server";

import { callGeminiJson } from "@/lib/geminiClient";

type TargetLanguage = "English" | "Arabic" | "Spanish";
type LearnerLevel = "Beginner" | "Intermediate" | "Advanced";
type RepeatDifficulty = 1 | 2 | 3;

type GenerateRequest = {
  action: "generate";
  targetLanguage: TargetLanguage;
  level: LearnerLevel;
  scenario: string;
};

type EvaluateRequest = {
  action: "evaluate";
  targetLanguage: TargetLanguage;
  expectedSentence: string;
  transcript: string;
};

type GenerateResponse = {
  sentence: string;
  difficulty: RepeatDifficulty;
};

type EvaluateGeminiShape = {
  corrected_version: string;
  tips: string[];
  encouragement: string;
};

type EvaluateResponse = {
  clarityScore: number;
  transcript: string;
  corrected_version: string;
  tips: string[];
  encouragement: string;
};

const TARGET_LANGUAGES: TargetLanguage[] = ["English", "Arabic", "Spanish"];
const LEVELS: LearnerLevel[] = ["Beginner", "Intermediate", "Advanced"];
const GENERIC_TIPS = [
  "Try speaking more clearly.",
  "Slow down slightly.",
  "Pause briefly between words.",
];

function toTargetLanguage(value: unknown): TargetLanguage {
  if (typeof value === "string" && TARGET_LANGUAGES.includes(value as TargetLanguage)) {
    return value as TargetLanguage;
  }
  return "English";
}

function toLevel(value: unknown): LearnerLevel {
  if (typeof value === "string" && LEVELS.includes(value as LearnerLevel)) {
    return value as LearnerLevel;
  }
  return "Intermediate";
}

function toScenario(value: unknown): string {
  if (typeof value !== "string") {
    return "General conversation";
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "General conversation";
}

function toDifficulty(level: LearnerLevel): RepeatDifficulty {
  if (level === "Advanced") {
    return 3;
  }
  if (level === "Intermediate") {
    return 2;
  }
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeForSimilarity(input: string): string {
  return input
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  const normalized = normalizeForSimilarity(input);
  if (!normalized) {
    return [];
  }
  return normalized.split(" ");
}

function buildFrequencyMap(words: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const word of words) {
    map.set(word, (map.get(word) ?? 0) + 1);
  }
  return map;
}

function computeClarityScore(expectedSentence: string, transcript: string): number {
  const expectedWords = tokenize(expectedSentence);
  const spokenWords = tokenize(transcript);

  if (expectedWords.length === 0) {
    return 0;
  }

  const expectedFreq = buildFrequencyMap(expectedWords);
  const spokenFreq = buildFrequencyMap(spokenWords);

  let sharedCount = 0;
  for (const [word, expectedCount] of expectedFreq.entries()) {
    sharedCount += Math.min(expectedCount, spokenFreq.get(word) ?? 0);
  }

  const overlapRatio = sharedCount / expectedWords.length;
  const lengthGap = Math.abs(expectedWords.length - spokenWords.length);
  const lengthPenalty = 1 - Math.min(1, lengthGap / Math.max(expectedWords.length, 1));
  const weighted = overlapRatio * 0.8 + Math.max(0, lengthPenalty) * 0.2;

  return clamp(Math.round(weighted * 100), 0, 100);
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function sanitizeSentence(sentence: string): string {
  return sentence.replace(/\s+/g, " ").trim();
}

function fallbackGenerateSentence({
  targetLanguage,
  scenario,
  level,
}: {
  targetLanguage: TargetLanguage;
  scenario: string;
  level: LearnerLevel;
}): string {
  const scenarioLower = scenario.toLocaleLowerCase();

  if (targetLanguage === "Arabic") {
    if (scenarioLower.includes("airport")) {
      return "أين بوابة الصعود لرحلتي من فضلك؟";
    }
    if (scenarioLower.includes("hotel")) {
      return "لدي حجز باسم أحمد لهذه الليلة.";
    }
    if (scenarioLower.includes("doctor")) {
      return "أشعر بصداع خفيف منذ صباح اليوم.";
    }
    if (scenarioLower.includes("job")) {
      return "لدي خبرة عملية قوية في إدارة الفريق.";
    }
    if (level === "Advanced") {
      return "أحتاج توضيح الشروط قبل اتخاذ القرار النهائي.";
    }
    if (level === "Intermediate") {
      return "هل يمكن أن تعيد الجملة ببطء أكثر؟";
    }
    return "أريد طلب وجبة نباتية من القائمة.";
  }

  if (targetLanguage === "Spanish") {
    if (scenarioLower.includes("airport")) {
      return "¿Dónde está mi puerta de embarque, por favor?";
    }
    if (scenarioLower.includes("hotel")) {
      return "Tengo una reserva para dos noches aquí.";
    }
    if (scenarioLower.includes("doctor")) {
      return "Tengo dolor de garganta desde ayer.";
    }
    if (scenarioLower.includes("job")) {
      return "Tengo experiencia liderando equipos de proyecto.";
    }
    if (level === "Advanced") {
      return "Necesito confirmar los detalles antes de continuar.";
    }
    if (level === "Intermediate") {
      return "¿Puede repetir eso un poco más despacio?";
    }
    return "Quiero pedir una sopa y agua, gracias.";
  }

  if (scenarioLower.includes("airport")) {
    return "Where is my boarding gate, please?";
  }
  if (scenarioLower.includes("hotel")) {
    return "I have a reservation for two nights.";
  }
  if (scenarioLower.includes("doctor")) {
    return "I have had a headache since morning.";
  }
  if (scenarioLower.includes("job")) {
    return "I have strong experience managing project teams.";
  }
  if (level === "Advanced") {
    return "I need clarification before finalizing this decision.";
  }
  if (level === "Intermediate") {
    return "Could you repeat that a little more slowly?";
  }
  return "I would like to order a chicken salad.";
}

function normalizeGenerateResponse(
  raw: unknown,
  fallback: GenerateResponse,
): GenerateResponse {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const rawSentence = typeof source.sentence === "string" ? sanitizeSentence(source.sentence) : "";
  const wordCount = countWords(rawSentence);
  const sentence =
    rawSentence.length > 0 && wordCount >= 5 && wordCount <= 12 ? rawSentence : fallback.sentence;

  const rawDifficulty = source.difficulty;
  const difficulty: RepeatDifficulty =
    rawDifficulty === 1 || rawDifficulty === 2 || rawDifficulty === 3
      ? rawDifficulty
      : fallback.difficulty;

  return {
    sentence,
    difficulty,
  };
}

function normalizeTips(rawTips: unknown): string[] {
  if (!Array.isArray(rawTips)) {
    return GENERIC_TIPS;
  }

  const tips = rawTips
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);

  if (tips.length >= 2) {
    return tips;
  }

  return [...tips, ...GENERIC_TIPS].slice(0, 3);
}

function normalizeEvaluateGeminiShape(
  raw: unknown,
  fallback: EvaluateGeminiShape,
): EvaluateGeminiShape {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const correctedVersion =
    typeof source.corrected_version === "string" && source.corrected_version.trim().length > 0
      ? source.corrected_version.trim()
      : fallback.corrected_version;
  const encouragement =
    typeof source.encouragement === "string" && source.encouragement.trim().length > 0
      ? source.encouragement.trim()
      : fallback.encouragement;
  const tips = normalizeTips(source.tips);

  return {
    corrected_version: correctedVersion,
    tips,
    encouragement,
  };
}

function parseGenerateRequest(raw: unknown): GenerateRequest {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    action: "generate",
    targetLanguage: toTargetLanguage(source.targetLanguage),
    level: toLevel(source.level),
    scenario: toScenario(source.scenario),
  };
}

function parseEvaluateRequest(raw: unknown): EvaluateRequest {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    action: "evaluate",
    targetLanguage: toTargetLanguage(source.targetLanguage),
    expectedSentence: typeof source.expectedSentence === "string" ? source.expectedSentence.trim() : "",
    transcript: typeof source.transcript === "string" ? source.transcript.trim() : "",
  };
}

async function handleGenerate(input: GenerateRequest): Promise<GenerateResponse> {
  const fallback: GenerateResponse = {
    sentence: fallbackGenerateSentence(input),
    difficulty: toDifficulty(input.level),
  };

  const schemaInstruction =
    'Return only valid JSON with exactly this schema: {"sentence":"string","difficulty":1}.';
  const prompt = [
    `Generate one short repeat-after-me sentence in ${input.targetLanguage}.`,
    `Level: ${input.level}.`,
    `Scenario: ${input.scenario}.`,
    "Rules:",
    "- sentence must be natural, scenario-aware, and 5 to 12 words.",
    "- do not translate from a template.",
    "- sentence must be fully in the target language.",
    `- difficulty must be ${fallback.difficulty}.`,
    schemaInstruction,
  ].join("\n");

  const gemini = await callGeminiJson<unknown>({
    routeTag: "api/repeat.generate",
    systemPrompt: "You create natural pronunciation drill prompts and return strict JSON.",
    userPrompt: prompt,
    maxParseAttempts: 2,
  });

  if (!gemini.ok) {
    console.warn(`[api/repeat] generate fallback reason=${gemini.reason}`);
    return fallback;
  }

  return normalizeGenerateResponse(gemini.data, fallback);
}

async function handleEvaluate(input: EvaluateRequest): Promise<EvaluateResponse> {
  const clarityScore = computeClarityScore(input.expectedSentence, input.transcript);

  const fallbackGemini: EvaluateGeminiShape = {
    corrected_version: input.expectedSentence || input.transcript || "",
    tips: GENERIC_TIPS,
    encouragement: "Good effort. Keep practicing for clearer pronunciation.",
  };

  const schemaInstruction =
    'Return only valid JSON with exactly this schema: {"corrected_version":"string","tips":["string","string","string"],"encouragement":"string"}.';
  const prompt = [
    `Target language: ${input.targetLanguage}.`,
    `Expected sentence: "${input.expectedSentence}".`,
    `Learner transcript: "${input.transcript}".`,
    "Analyze likely pronunciation clarity issues from the transcript comparison.",
    "Provide a corrected_version, 2-3 short pronunciation tips, and one short encouragement sentence.",
    "Keep all feedback concise and practical.",
    schemaInstruction,
  ].join("\n");

  const gemini = await callGeminiJson<unknown>({
    routeTag: "api/repeat.evaluate",
    systemPrompt: "You are a pronunciation clarity coach and must return strict JSON.",
    userPrompt: prompt,
    maxParseAttempts: 2,
  });

  const normalizedGemini = gemini.ok
    ? normalizeEvaluateGeminiShape(gemini.data, fallbackGemini)
    : fallbackGemini;

  if (!gemini.ok) {
    console.warn(`[api/repeat] evaluate fallback reason=${gemini.reason}`);
  }

  return {
    clarityScore,
    transcript: input.transcript,
    corrected_version: normalizedGemini.corrected_version,
    tips: normalizedGemini.tips,
    encouragement: normalizedGemini.encouragement,
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action =
    payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).action === "string"
      ? (payload as Record<string, unknown>).action
      : "";

  if (action === "generate") {
    const input = parseGenerateRequest(payload);
    const response = await handleGenerate(input);
    return NextResponse.json(response);
  }

  if (action === "evaluate") {
    const input = parseEvaluateRequest(payload);
    const response = await handleEvaluate(input);
    return NextResponse.json(response);
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
