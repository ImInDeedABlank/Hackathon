import "server-only";

import { callGeminiJson } from "@/lib/geminiClient";
import type {
  CEFRLevel,
  LearningVideoLanguage,
  NormalizedPlacementProfile,
  TopicRecommendation,
  VideoRecommendationModel,
} from "@/types/learningVideos";

type FallbackTopicTemplate = {
  topic: string;
  reason: string;
  queries: [string, string];
};

type TopicRecord = Record<CEFRLevel, FallbackTopicTemplate[]>;
type FallbackLibrary = Record<LearningVideoLanguage, TopicRecord>;

const FALLBACK_TOPICS: FallbackLibrary = {
  English: {
    A1: [
      {
        topic: "Basic greetings and introductions",
        reason: "Supports A1 survival communication and first-contact exchanges.",
        queries: ["English A1 greetings lesson", "Beginner English introductions explained"],
      },
      {
        topic: "Numbers, time, and daily routines",
        reason: "Builds foundational vocabulary used in daily interactions.",
        queries: ["English beginner daily routine vocabulary", "A1 English telling time lesson"],
      },
      {
        topic: "Simple present and yes/no questions",
        reason: "Strengthens high-frequency sentence patterns for beginners.",
        queries: ["A1 English simple present explained", "Beginner English yes no questions lesson"],
      },
      {
        topic: "Restaurant and shopping basics",
        reason: "Targets practical phrases used in common service situations.",
        queries: ["Beginner English ordering food phrases", "A1 English shopping conversation lesson"],
      },
    ],
    A2: [
      {
        topic: "Everyday conversations and follow-up questions",
        reason: "Improves interaction flow for short real-life conversations.",
        queries: ["English A2 conversation practice explained", "A2 English asking follow up questions"],
      },
      {
        topic: "Past tense for personal experiences",
        reason: "Helps learners describe recent events with clearer timelines.",
        queries: ["A2 English past tense lesson", "Beginner intermediate English talking about experiences"],
      },
      {
        topic: "Prepositions and sentence accuracy",
        reason: "Addresses frequent grammar mistakes in location/time phrases.",
        queries: ["English A2 prepositions explained", "A2 grammar common mistakes English"],
      },
      {
        topic: "Listening with short authentic dialogues",
        reason: "Builds comprehension speed for everyday speech.",
        queries: ["A2 English listening practice dialogue", "English beginner intermediate real life listening"],
      },
    ],
    B1: [
      {
        topic: "Structured speaking for opinions and reasons",
        reason: "Matches B1 goals for coherent spoken explanations.",
        queries: ["English B1 speaking opinions lesson", "B1 English giving reasons naturally"],
      },
      {
        topic: "Narrative tenses and storytelling",
        reason: "Improves clarity when describing sequences and experiences.",
        queries: ["B1 English narrative tenses explained", "Intermediate English storytelling grammar"],
      },
      {
        topic: "Phrasal verbs in everyday contexts",
        reason: "Expands natural vocabulary used in daily communication.",
        queries: ["B1 phrasal verbs English lesson", "Intermediate English phrasal verbs in context"],
      },
      {
        topic: "Listening strategies for longer conversations",
        reason: "Builds stamina and detail capture in multi-turn audio.",
        queries: ["B1 English listening strategies", "Intermediate English conversation listening practice"],
      },
    ],
    B2: [
      {
        topic: "Fluent discussion and argument structure",
        reason: "Supports B2 ability to defend ideas with precision.",
        queries: ["English B2 discussion skills", "Upper intermediate English argument structure"],
      },
      {
        topic: "Advanced grammar for nuance",
        reason: "Refines complex sentence control and accuracy.",
        queries: ["B2 English advanced grammar explained", "Upper intermediate English nuance grammar"],
      },
      {
        topic: "Collocations for professional communication",
        reason: "Improves lexical naturalness in work/academic settings.",
        queries: ["B2 English collocations lesson", "Professional English collocations explained"],
      },
      {
        topic: "Fast speech listening and note-taking",
        reason: "Targets real-world listening speed and detail retention.",
        queries: ["B2 English fast listening practice", "Advanced English listening note taking"],
      },
    ],
    C1: [
      {
        topic: "Precision speaking and discourse control",
        reason: "Matches C1 goals for precise, structured communication.",
        queries: ["English C1 speaking precision lesson", "Advanced English discourse markers C1"],
      },
      {
        topic: "Register shifts and tone management",
        reason: "Helps adapt language style across formal and informal contexts.",
        queries: ["C1 English register and tone", "Advanced English formal informal language"],
      },
      {
        topic: "Idiomatic and natural advanced usage",
        reason: "Builds native-like phrasing and collocational range.",
        queries: ["C1 English idiomatic expressions explained", "Advanced English natural expressions lesson"],
      },
      {
        topic: "Academic/professional listening synthesis",
        reason: "Improves extracting main points and implications from dense input.",
        queries: ["C1 English listening advanced lecture", "Advanced English listening synthesis practice"],
      },
    ],
  },
  Arabic: {
    A1: [
      {
        topic: "Arabic greetings and self-introduction",
        reason: "Covers essential A1 communicative needs in daily situations.",
        queries: ["Arabic A1 greetings lesson", "Beginner Arabic introductions explained"],
      },
      {
        topic: "Basic sentence patterns and pronouns",
        reason: "Builds foundational structure for short correct sentences.",
        queries: ["Arabic beginner sentence structure", "A1 Arabic pronouns lesson"],
      },
      {
        topic: "Numbers, days, and daily life vocabulary",
        reason: "Supports routine interactions and time references.",
        queries: ["Arabic A1 daily vocabulary lesson", "Beginner Arabic numbers and days"],
      },
      {
        topic: "Simple question and answer drills",
        reason: "Improves confidence in two-way beginner conversation.",
        queries: ["Arabic beginner question answer practice", "A1 Arabic conversation basics"],
      },
    ],
    A2: [
      {
        topic: "Everyday dialogues in common places",
        reason: "Develops practical speaking patterns for A2 routines.",
        queries: ["Arabic A2 conversation lesson", "Arabic daily situations dialogue practice"],
      },
      {
        topic: "Past and present usage in context",
        reason: "Improves tense clarity for short personal narratives.",
        queries: ["Arabic A2 past present verbs", "Intermediate beginner Arabic grammar tense lesson"],
      },
      {
        topic: "Listening to short MSA conversations",
        reason: "Builds comprehension speed with natural spoken input.",
        queries: ["Arabic A2 listening practice", "MSA short dialogue listening lesson"],
      },
      {
        topic: "Expanding core vocabulary themes",
        reason: "Adds range for common topics like travel and services.",
        queries: ["Arabic A2 vocabulary themes", "Arabic beginner intermediate travel vocabulary"],
      },
    ],
    B1: [
      {
        topic: "Explaining opinions and experiences",
        reason: "Matches B1 goals for clearer, connected speech.",
        queries: ["Arabic B1 speaking opinions lesson", "Intermediate Arabic expressing experiences"],
      },
      {
        topic: "Connector words for coherent speech",
        reason: "Improves flow and structure in longer answers.",
        queries: ["Arabic B1 connectors lesson", "Intermediate Arabic speaking coherence"],
      },
      {
        topic: "Intermediate listening with authentic clips",
        reason: "Builds understanding across normal speaking speed.",
        queries: ["Arabic B1 listening practice", "Intermediate MSA listening explained"],
      },
      {
        topic: "Grammar refinement for accuracy",
        reason: "Targets common intermediate grammar errors.",
        queries: ["Arabic B1 grammar mistakes", "Intermediate Arabic grammar explained"],
      },
    ],
    B2: [
      {
        topic: "Advanced discussion skills in MSA",
        reason: "Supports structured argument and response at B2.",
        queries: ["Arabic B2 discussion skills", "Upper intermediate Arabic speaking lesson"],
      },
      {
        topic: "Nuanced grammar and style choices",
        reason: "Refines precision in complex sentence production.",
        queries: ["Arabic B2 advanced grammar", "Upper intermediate Arabic style lesson"],
      },
      {
        topic: "Topic-based vocabulary expansion",
        reason: "Builds lexical depth for professional and social topics.",
        queries: ["Arabic B2 vocabulary expansion", "Advanced Arabic thematic vocabulary"],
      },
      {
        topic: "Long-form listening and summarizing",
        reason: "Improves capturing key points from extended audio.",
        queries: ["Arabic B2 listening comprehension", "Advanced Arabic summarize listening practice"],
      },
    ],
    C1: [
      {
        topic: "High-level discourse and argumentation",
        reason: "Develops C1 control in complex spoken/written reasoning.",
        queries: ["Arabic C1 argumentation lesson", "Advanced Arabic discourse markers"],
      },
      {
        topic: "Register and rhetorical style",
        reason: "Improves adaptation to formal and semi-formal contexts.",
        queries: ["Arabic C1 register style", "Advanced Arabic formal language lesson"],
      },
      {
        topic: "Advanced collocations and precision",
        reason: "Enhances naturalness and lexical sophistication.",
        queries: ["Arabic C1 collocations", "Advanced Arabic natural expressions"],
      },
      {
        topic: "Academic/professional comprehension tasks",
        reason: "Strengthens synthesis and critical listening.",
        queries: ["Arabic C1 listening advanced", "Advanced Arabic comprehension lecture"],
      },
    ],
  },
  Spanish: {
    A1: [
      {
        topic: "Saludos y presentaciones basicas",
        reason: "Supports beginner communicative survival goals.",
        queries: ["Spanish A1 greetings lesson", "Beginner Spanish introductions explained"],
      },
      {
        topic: "Vocabulario cotidiano esencial",
        reason: "Builds core words used in daily beginner interactions.",
        queries: ["Spanish A1 daily vocabulary lesson", "Beginner Spanish common phrases explained"],
      },
      {
        topic: "Presente simple y preguntas basicas",
        reason: "Improves sentence formation for simple Q&A.",
        queries: ["Spanish A1 present tense explained", "Beginner Spanish basic questions lesson"],
      },
      {
        topic: "Situaciones practicas: comida y compras",
        reason: "Targets high-frequency real-life conversation needs.",
        queries: ["Spanish beginner ordering food phrases", "A1 Spanish shopping conversation lesson"],
      },
    ],
    A2: [
      {
        topic: "Conversaciones diarias con seguimiento",
        reason: "Builds ability to keep short interactions moving.",
        queries: ["Spanish A2 conversation practice", "A2 Spanish follow up questions lesson"],
      },
      {
        topic: "Preterito y descripcion de experiencias",
        reason: "Supports clearer narration of recent events.",
        queries: ["Spanish A2 past tense lesson", "A2 Spanish talking about experiences"],
      },
      {
        topic: "Comprension auditiva con dialogos breves",
        reason: "Improves listening speed and contextual understanding.",
        queries: ["Spanish A2 listening practice dialogue", "Beginner intermediate Spanish listening"],
      },
      {
        topic: "Preposiciones y precision gramatical",
        reason: "Addresses frequent learner mistakes in structure.",
        queries: ["Spanish A2 prepositions explained", "A2 Spanish grammar common mistakes"],
      },
    ],
    B1: [
      {
        topic: "Expresar opiniones con claridad",
        reason: "Matches B1 communicative targets for organized speech.",
        queries: ["Spanish B1 speaking opinions lesson", "Intermediate Spanish giving reasons"],
      },
      {
        topic: "Conectores y fluidez discursiva",
        reason: "Improves coherence in longer spoken responses.",
        queries: ["Spanish B1 connectors lesson", "Intermediate Spanish speaking fluency"],
      },
      {
        topic: "Vocabulario funcional en contexto",
        reason: "Expands lexical range for common adult topics.",
        queries: ["Spanish B1 vocabulary in context", "Intermediate Spanish practical vocabulary"],
      },
      {
        topic: "Escucha intermedia con habla natural",
        reason: "Builds comprehension across natural conversation pace.",
        queries: ["Spanish B1 listening natural speech", "Intermediate Spanish listening explained"],
      },
    ],
    B2: [
      {
        topic: "Debate y argumentacion en espanol",
        reason: "Supports B2 goals for nuanced discussion.",
        queries: ["Spanish B2 discussion skills", "Upper intermediate Spanish argumentation lesson"],
      },
      {
        topic: "Gramatica avanzada para matices",
        reason: "Refines precision and complexity in output.",
        queries: ["Spanish B2 advanced grammar explained", "Upper intermediate Spanish nuance grammar"],
      },
      {
        topic: "Colocaciones y expresion natural",
        reason: "Improves idiomatic and context-appropriate usage.",
        queries: ["Spanish B2 collocations lesson", "Upper intermediate Spanish natural expressions"],
      },
      {
        topic: "Comprension de audio extenso",
        reason: "Builds stamina for longer, denser listening material.",
        queries: ["Spanish B2 listening comprehension", "Advanced Spanish long listening practice"],
      },
    ],
    C1: [
      {
        topic: "Control del discurso avanzado",
        reason: "Builds precision and structure expected at C1.",
        queries: ["Spanish C1 advanced speaking lesson", "C1 Spanish discourse markers"],
      },
      {
        topic: "Registro y tono segun contexto",
        reason: "Helps adapt language to formal/informal situations.",
        queries: ["Spanish C1 register and tone", "Advanced Spanish formal informal language"],
      },
      {
        topic: "Expresion idiomatica y estilo natural",
        reason: "Increases native-like fluency and lexical depth.",
        queries: ["Spanish C1 idiomatic expressions explained", "Advanced Spanish natural phrasing"],
      },
      {
        topic: "Analisis y sintesis de contenidos complejos",
        reason: "Strengthens advanced listening and summarization skills.",
        queries: ["Spanish C1 listening synthesis practice", "Advanced Spanish lecture comprehension"],
      },
    ],
  },
};

function safeText(value: unknown, fallback: string, max = 240): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.slice(0, max);
}

function uniqueNonEmpty(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

function fallbackRecommendations(profile: NormalizedPlacementProfile): VideoRecommendationModel {
  const templates = FALLBACK_TOPICS[profile.selectedLanguage][profile.cefrLevel];
  const recommendedTopics: TopicRecommendation[] = templates.slice(0, 4).map((entry) => ({
    topic: entry.topic,
    reason: entry.reason,
    difficulty: profile.cefrLevel,
    searchQueries: [...entry.queries],
  }));

  return {
    language: profile.selectedLanguageCode,
    level: profile.cefrLevel,
    learnerProfileSummary: `Learner is around ${profile.cefrLevel} with confidence ${profile.confidence}%. Focus should balance strengths and known gaps from placement.`,
    recommendedTopics,
    pacingAdvice: "Watch 15-25 minutes per session and pause to shadow key phrases.",
    weeklyPlanHint: "Use 4 sessions: foundations, guided practice, applied speaking/writing, and review.",
  };
}

function normalizeTopic(
  raw: unknown,
  fallback: TopicRecommendation,
  fallbackLevel: CEFRLevel,
): TopicRecommendation {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const source = raw as Record<string, unknown>;
  const queriesRaw = Array.isArray(source.searchQueries) ? source.searchQueries : [];
  const queries = uniqueNonEmpty(
    queriesRaw.filter((item): item is string => typeof item === "string"),
    4,
  );

  return {
    topic: safeText(source.topic, fallback.topic, 100),
    reason: safeText(source.reason, fallback.reason, 220),
    difficulty:
      source.difficulty === "A1" ||
      source.difficulty === "A2" ||
      source.difficulty === "B1" ||
      source.difficulty === "B2" ||
      source.difficulty === "C1"
        ? source.difficulty
        : fallbackLevel,
    searchQueries: queries.length >= 2 ? queries : fallback.searchQueries,
  };
}

function normalizeGeminiRecommendation(
  raw: unknown,
  profile: NormalizedPlacementProfile,
  fallback: VideoRecommendationModel,
): VideoRecommendationModel | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const topicsRaw = Array.isArray(source.recommendedTopics) ? source.recommendedTopics : null;
  if (!topicsRaw || topicsRaw.length === 0) {
    return null;
  }

  const normalizedTopics = topicsRaw
    .slice(0, 5)
    .map((item, index) =>
      normalizeTopic(item, fallback.recommendedTopics[index % fallback.recommendedTopics.length], profile.cefrLevel),
    );
  const finalTopics = normalizedTopics.length >= 3 ? normalizedTopics : fallback.recommendedTopics;

  return {
    language: safeText(source.language, profile.selectedLanguageCode, 12),
    level:
      source.level === "A1" ||
      source.level === "A2" ||
      source.level === "B1" ||
      source.level === "B2" ||
      source.level === "C1"
        ? source.level
        : profile.cefrLevel,
    learnerProfileSummary: safeText(
      source.learnerProfileSummary,
      fallback.learnerProfileSummary,
      420,
    ),
    recommendedTopics: finalTopics,
    pacingAdvice: safeText(source.pacingAdvice, fallback.pacingAdvice, 260),
    weeklyPlanHint: safeText(source.weeklyPlanHint, fallback.weeklyPlanHint, 260),
  };
}

function recommendationPrompt(profile: NormalizedPlacementProfile): string {
  return [
    "Build personalized explanation-style learning-video recommendations for this learner profile.",
    `Target language to learn: ${profile.selectedLanguage} (${profile.selectedLanguageCode})`,
    `Placement band: ${profile.level}`,
    `CEFR level: ${profile.cefrLevel}`,
    `Placement score: ${profile.numericScore}/100`,
    `Placement confidence: ${profile.confidence}/100`,
    `Strengths: ${profile.strengths.join(" | ")}`,
    `Weaknesses: ${profile.weaknesses.join(" | ")}`,
    "Output only strict JSON with this schema:",
    `{
  "language": "en|ar|es",
  "level": "A1|A2|B1|B2|C1",
  "learnerProfileSummary": "string",
  "recommendedTopics": [
    {
      "topic": "string",
      "reason": "string",
      "difficulty": "A1|A2|B1|B2|C1",
      "searchQueries": ["string", "string"]
    }
  ],
  "pacingAdvice": "string",
  "weeklyPlanHint": "string"
}`,
    "Rules:",
    "- Return 4-5 recommendedTopics.",
    "- Queries should be YouTube-friendly educational searches.",
    "- Keep rationale practical and linked to strengths/weaknesses.",
  ].join("\n");
}

export async function generateVideoRecommendations(
  profile: NormalizedPlacementProfile,
  requestId?: string,
): Promise<{
  recommendation: VideoRecommendationModel;
  usedGemini: boolean;
  usedFallbackTopics: boolean;
  error?: string;
}> {
  const fallback = fallbackRecommendations(profile);
  const gemini = await callGeminiJson<unknown>({
    routeName: "api/learning-videos.recommend",
    requestId,
    prompt: `System Prompt:\nYou are LinguaSim pedagogical recommendation planner. Return strict JSON only.\n\nUser Input:\n${recommendationPrompt(profile)}`,
    schema:
      '{"language":"en","level":"A1","learnerProfileSummary":"string","recommendedTopics":[{"topic":"string","reason":"string","difficulty":"A1","searchQueries":["string","string"]}],"pacingAdvice":"string","weeklyPlanHint":"string"}',
    maxOutputTokens: 1400,
    singleFlightParts: {
      language: profile.selectedLanguageCode,
      mode: "learning_videos_recommend",
      stepId: profile.cefrLevel,
    },
  });

  if (!gemini.ok) {
    console.warn(`[api/learning-videos] Using fallback recommendation reason=${gemini.reason}`);
    return {
      recommendation: fallback,
      usedGemini: false,
      usedFallbackTopics: true,
      error: gemini.reason === "missing_key" ? undefined : `Gemini recommendation failed (${gemini.reason}).`,
    };
  }

  const normalized = normalizeGeminiRecommendation(gemini.data, profile, fallback);
  if (!normalized) {
    console.warn("[api/learning-videos] Using fallback recommendation reason=invalid_model_shape");
    return {
      recommendation: fallback,
      usedGemini: true,
      usedFallbackTopics: true,
      error: "Recommendation format invalid. Fallback topics applied.",
    };
  }

  return {
    recommendation: normalized,
    usedGemini: true,
    usedFallbackTopics: false,
  };
}
