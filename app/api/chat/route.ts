import { NextResponse } from "next/server";

import {
  buildSystemPrompt,
  type LearnerLevel,
  type TargetLanguage,
  type UILanguage,
} from "@/lib/chatPrompt";
import {
  callGeminiJson,
  defaultGeminiDebugInfo,
  isDiagnosticRequest,
  type GeminiDebugInfo,
} from "@/lib/geminiClient";
import { getScenarioPersona, type SupportedScenario } from "@/lib/scenarios";
import { validateResponseShape, type ChatResponseShape } from "@/lib/validate";

type ChatInput = {
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  level: LearnerLevel;
  scenario: SupportedScenario;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

const TARGET_LANGUAGES = ["English", "Arabic", "Spanish"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const SCENARIOS = ["Airport", "Ordering Food", "Job Interview", "Hotel Check-in", "Doctor Visit"] as const;
const DEFAULT_INPUT: ChatInput = {
  uiLanguage: "en",
  targetLanguage: "English",
  level: "Beginner",
  scenario: "Ordering Food",
  messages: [],
};

const MOCK_AI_REPLIES: Record<SupportedScenario, Record<TargetLanguage, string>> = {
  Airport: {
    English: "Passport and boarding pass, please. What is the purpose of your trip today?",
    Arabic: "جواز السفر وبطاقة الصعود من فضلك. ما سبب رحلتك اليوم؟",
    Spanish: "Pasaporte y tarjeta de embarque, por favor. ¿Cuál es el motivo de su viaje hoy?",
  },
  "Ordering Food": {
    English: "Welcome. What would you like to order today? We also have a lunch special.",
    Arabic: "مرحبًا بك. ماذا تود أن تطلب اليوم؟ لدينا أيضًا عرض الغداء.",
    Spanish: "Bienvenido. ¿Qué le gustaría pedir hoy? También tenemos un especial de almuerzo.",
  },
  "Job Interview": {
    English: "Thanks for joining us. Could you briefly describe your most relevant experience for this role?",
    Arabic: "شكرًا لحضورك. هل يمكنك وصف خبرتك الأكثر صلة بهذه الوظيفة باختصار؟",
    Spanish: "Gracias por venir. ¿Podría describir brevemente su experiencia más relevante para este puesto?",
  },
  "Hotel Check-in": {
    English: "Good evening. May I have your name and reservation number to complete check-in?",
    Arabic: "مساء الخير. هل يمكنني الحصول على اسمك ورقم الحجز لإتمام تسجيل الدخول؟",
    Spanish: "Buenas noches. ¿Me puede dar su nombre y número de reserva para completar el registro?",
  },
  "Doctor Visit": {
    English: "Hello, I’m your doctor today. What symptoms are you having, and when did they start?",
    Arabic: "مرحبًا، أنا طبيبك اليوم. ما الأعراض التي تشعر بها ومتى بدأت؟",
    Spanish: "Hola, soy su médico hoy. ¿Qué síntomas tiene y cuándo empezaron?",
  },
};

function toUiLanguage(value: unknown): UILanguage {
  return value === "ar" ? "ar" : "en";
}

function toTargetLanguage(value: unknown): TargetLanguage {
  if (typeof value === "string" && TARGET_LANGUAGES.includes(value as TargetLanguage)) {
    return value as TargetLanguage;
  }
  return DEFAULT_INPUT.targetLanguage;
}

function toLevel(value: unknown): LearnerLevel {
  if (typeof value === "string" && LEVELS.includes(value as LearnerLevel)) {
    return value as LearnerLevel;
  }
  return DEFAULT_INPUT.level;
}

function toScenario(value: unknown): SupportedScenario {
  if (typeof value === "string" && SCENARIOS.includes(value as SupportedScenario)) {
    return value as SupportedScenario;
  }
  return DEFAULT_INPUT.scenario;
}

function toMessages(value: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const source = item as Record<string, unknown>;
      const role = source.role;
      const content = source.content;
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
        return null;
      }
      const trimmed = content.trim();
      if (!trimmed) {
        return null;
      }
      return {
        role,
        content: trimmed,
      };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => item !== null)
    .slice(-20);
}

function parseChatInput(raw: unknown): ChatInput {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_INPUT;
  }

  const source = raw as Record<string, unknown>;

  return {
    uiLanguage: toUiLanguage(source.uiLanguage),
    targetLanguage: toTargetLanguage(source.targetLanguage),
    level: toLevel(source.level),
    scenario: toScenario(source.scenario),
    messages: toMessages(source.messages),
  };
}

function buildMockResponse(input: ChatInput): ChatResponseShape {
  const persona = getScenarioPersona(input.scenario);
  const scoreByLevel: Record<LearnerLevel, number> = {
    Beginner: 6,
    Intermediate: 7,
    Advanced: 8,
  };

  if (input.uiLanguage === "ar") {
    return {
      ai_reply: MOCK_AI_REPLIES[input.scenario][input.targetLanguage],
      feedback: {
        corrected_version: `ردّك واضح. جرّب إضافة تفصيل صغير يناسب دور ${persona.roleName}.`,
        key_mistakes: [
          "استخدم ترتيب كلمات أبسط عند الشك.",
          "راجع تصريف الفعل مع الفاعل في الجملة.",
          "أضف سؤال متابعة قصيرًا للحفاظ على الحوار.",
        ],
        natural_alternatives: [
          "استخدم عبارة مهذبة أقصر قبل الطلب الأساسي.",
          "قسّم الجملة الطويلة إلى جملتين أو ثلاث جمل قصيرة.",
        ],
        grammar_note: "حافظ على زمن واحد في الجملة نفسها لتبقى الرسالة أوضح.",
      },
      score: scoreByLevel[input.level],
    };
  }

  return {
    ai_reply: MOCK_AI_REPLIES[input.scenario][input.targetLanguage],
    feedback: {
      corrected_version: `Your response is clear. Add one concrete detail that matches the ${persona.roleName} context.`,
      key_mistakes: [
        "Keep sentence order simple when unsure.",
        "Check verb form agreement in each sentence.",
        "Add one short follow-up question to sustain the dialogue.",
      ],
      natural_alternatives: [
        "Use a short polite opener before the main request.",
        "Split long ideas into two shorter sentences.",
      ],
      grammar_note: "Use one tense consistently in each sentence for clearer meaning.",
    },
    score: scoreByLevel[input.level],
  };
}

function normalizeResponse(response: ChatResponseShape): ChatResponseShape {
  return {
    ai_reply: response.ai_reply.trim(),
    feedback: {
      corrected_version: response.feedback.corrected_version.trim(),
      key_mistakes: [
        response.feedback.key_mistakes[0].trim(),
        response.feedback.key_mistakes[1].trim(),
        response.feedback.key_mistakes[2].trim(),
      ],
      natural_alternatives: [
        response.feedback.natural_alternatives[0].trim(),
        response.feedback.natural_alternatives[1].trim(),
      ],
      grammar_note: response.feedback.grammar_note.trim(),
    },
    score: Math.max(0, Math.min(10, Math.round(response.score))),
  };
}

function withChatDebug(
  body: ChatResponseShape,
  {
    diagnostic,
    debug,
    error,
  }: {
    diagnostic: boolean;
    debug?: GeminiDebugInfo;
    error?: string;
  },
): ChatResponseShape & { debug?: GeminiDebugInfo; error?: string } {
  if (!diagnostic && !error) {
    return body;
  }
  return {
    ...body,
    ...(error ? { error } : {}),
    ...(diagnostic ? { debug: debug ?? defaultGeminiDebugInfo() } : {}),
  };
}

export async function POST(request: Request) {
  const diagnostic = isDiagnosticRequest(request);
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    console.warn("[api/chat] Using fallback reason=invalid_request_json");
    return NextResponse.json(
      withChatDebug(buildMockResponse(DEFAULT_INPUT), {
        diagnostic,
      }),
    );
  }

  const input = parseChatInput(payload);
  const fallback = buildMockResponse(input);
  const systemPrompt = buildSystemPrompt({
    uiLanguage: input.uiLanguage,
    targetLanguage: input.targetLanguage,
    level: input.level,
    scenario: input.scenario,
  });
  const conversation =
    input.messages.length > 0
      ? input.messages.map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`).join("\n")
      : "User: Begin the role-play with your opening line.";
  const schemaInstruction =
    'Return only valid JSON with exactly this schema: {"ai_reply":"string","feedback":{"corrected_version":"string","key_mistakes":["string","string","string"],"natural_alternatives":["string","string"],"grammar_note":"string"},"score":0}.';

  const gemini = await callGeminiJson<unknown>({
    routeTag: "api/chat",
    systemPrompt,
    userPrompt: `${conversation}\n\n${schemaInstruction}`,
    maxParseAttempts: 2,
  });

  if (!gemini.ok) {
    const status = gemini.reason === "missing_key" ? 200 : 500;
    const error =
      gemini.reason === "missing_key"
        ? "Gemini key missing. Using fallback response."
        : `Gemini request failed (${gemini.reason}). Using fallback response.`;
    console.warn(`[api/chat] Using fallback reason=${gemini.reason}`);
    return NextResponse.json(
      withChatDebug(fallback, {
        diagnostic,
        debug: gemini.debug,
        error: status === 500 ? error : undefined,
      }),
      { status },
    );
  }

  if (!validateResponseShape(gemini.data)) {
    console.warn("[api/chat] Using fallback reason=invalid_model_shape");
    return NextResponse.json(
      withChatDebug(fallback, {
        diagnostic,
        debug: gemini.debug,
        error: "Gemini response shape was invalid. Using fallback response.",
      }),
      { status: 500 },
    );
  }

  return NextResponse.json(
    withChatDebug(normalizeResponse(gemini.data), {
      diagnostic,
      debug: gemini.debug,
    }),
  );
}
