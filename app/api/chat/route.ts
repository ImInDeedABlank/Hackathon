import { NextResponse } from "next/server";

import {
  buildChatSystemPrompt,
  buildChatUserPrompt,
  type LearnerLevel,
  type TargetLanguage,
  type UILanguage,
} from "@/lib/chatPrompt";
import {
  buildGeminiRateLimitPayload,
  callGeminiJson,
  defaultGeminiDebugInfo,
  isGeminiRateLimitFailure,
  isDiagnosticRequest,
  requestIdFromRequest,
  type GeminiDebugInfo,
} from "@/lib/geminiClient";
import { type SupportedScenario } from "@/lib/scenarios";
import { validateResponseShape, type ChatResponseShape } from "@/lib/validate";

type ChatInput = {
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  level: LearnerLevel;
  scenario: SupportedScenario;
  mode: "Text" | "Speak";
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

const TARGET_LANGUAGES = ["English", "Arabic", "Spanish"] as const;
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const SCENARIOS = ["Airport", "Ordering Food", "Job Interview", "Hotel Check-in", "Doctor Visit"] as const;
const MODES = ["Text", "Speak"] as const;
const DEFAULT_INPUT: ChatInput = {
  uiLanguage: "en",
  targetLanguage: "English",
  level: "Intermediate",
  scenario: "Ordering Food",
  mode: "Text",
  messages: [],
};

const UI_TEXT = {
  en: {
    feedbackUnavailable: "Could not generate feedback.",
  },
  ar: {
    feedbackUnavailable: "\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u062D\u0627\u0644\u064A\u0627.",
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

function toMode(value: unknown): "Text" | "Speak" {
  if (typeof value === "string" && MODES.includes(value as (typeof MODES)[number])) {
    return value as "Text" | "Speak";
  }
  return DEFAULT_INPUT.mode;
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
    mode: toMode(source.mode),
    messages: toMessages(source.messages),
  };
}

function buildConversationTranscript(messages: ChatInput["messages"]): string {
  if (messages.length === 0) {
    return "User: Begin the role-play with your opening line.";
  }

  return messages
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");
}

function fallbackAssistantReply(targetLanguage: TargetLanguage): string {
  if (targetLanguage === "Arabic") {
    return "\u0634\u0643\u0631\u0627 \u0639\u0644\u0649 \u0631\u0633\u0627\u0644\u062A\u0643. \u0647\u0644 \u064A\u0645\u0643\u0646\u0643 \u0625\u0636\u0627\u0641\u0629 \u062A\u0641\u0635\u064A\u0644 \u0622\u062E\u0631\u061F";
  }
  if (targetLanguage === "Spanish") {
    return "Gracias por tu mensaje. ¿Puedes agregar un detalle más?";
  }
  return "Thanks for your message. Could you add one more detail?";
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
    try {
      const wrapped = stripped.replace(/^"([\s\S]*)"$/, "$1").trim();
      return JSON.parse(wrapped) as unknown;
    } catch {
      return null;
    }
  }
}

function replaceNullDecisionReason(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceNullDecisionReason(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(source)) {
    if (
      key === "decision" &&
      entry &&
      typeof entry === "object" &&
      (entry as Record<string, unknown>).reason === null
    ) {
      const decisionObject = { ...(entry as Record<string, unknown>) };
      decisionObject.reason = "";
      result[key] = replaceNullDecisionReason(decisionObject);
      continue;
    }

    result[key] = replaceNullDecisionReason(entry);
  }

  return result;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown, fallbackText: string): string[] {
  if (!Array.isArray(value)) {
    return [fallbackText];
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : [fallbackText];
}

function normalizeAiReply(rawReply: string, fallback: string): string {
  const trimmed = rawReply.trim();
  if (!trimmed) {
    return fallback;
  }

  const nested = parseJsonText(trimmed);
  if (nested && typeof nested === "object") {
    const nestedSource = nested as Record<string, unknown>;
    const candidate = asString(nestedSource.ai_reply) || asString(nestedSource.response);
    if (candidate) {
      return candidate;
    }
  }

  return stripJsonFences(trimmed) || fallback;
}

function buildFallbackPayload(
  input: ChatInput,
  lastUserMessage: string,
): ChatResponseShape {
  const unavailable = UI_TEXT[input.uiLanguage].feedbackUnavailable;

  return {
    ai_reply: fallbackAssistantReply(input.targetLanguage),
    feedback: {
      user_original: lastUserMessage,
      corrected_version: unavailable,
      key_mistakes: [unavailable],
      natural_alternatives: [unavailable],
      grammar_note: unavailable,
      improvement_tip: unavailable,
    },
    score: 5,
  };
}

function normalizeChatResponse({
  raw,
  input,
  lastUserMessage,
}: {
  raw: unknown;
  input: ChatInput;
  lastUserMessage: string;
}): ChatResponseShape | null {
  const cleanedRaw = replaceNullDecisionReason(raw);
  if (!cleanedRaw || typeof cleanedRaw !== "object") {
    return null;
  }

  const source = cleanedRaw as Record<string, unknown>;
  const feedbackSource =
    source.feedback && typeof source.feedback === "object"
      ? (source.feedback as Record<string, unknown>)
      : {};

  const unavailable = UI_TEXT[input.uiLanguage].feedbackUnavailable;

  const aiReplyCandidate =
    asString(source.ai_reply) || asString(source.response) || asString(source.reply);

  const normalized: ChatResponseShape = {
    ai_reply: normalizeAiReply(aiReplyCandidate, fallbackAssistantReply(input.targetLanguage)),
    feedback: {
      user_original: lastUserMessage,
      corrected_version: asString(feedbackSource.corrected_version) || unavailable,
      key_mistakes: toStringArray(feedbackSource.key_mistakes, unavailable),
      natural_alternatives: toStringArray(feedbackSource.natural_alternatives, unavailable),
      grammar_note: asString(feedbackSource.grammar_note) || unavailable,
      improvement_tip: asString(feedbackSource.improvement_tip) || unavailable,
    },
    score:
      typeof source.score === "number" && Number.isFinite(source.score)
        ? clamp(Math.round(source.score), 0, 10)
        : 5,
  };

  return validateResponseShape(normalized) ? normalized : null;
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
  const requestId = requestIdFromRequest(request);
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const fallback = buildFallbackPayload(DEFAULT_INPUT, "");
    return NextResponse.json(
      withChatDebug(fallback, {
        diagnostic,
        debug: defaultGeminiDebugInfo(requestId),
        error: "Invalid request JSON. Returned fallback response.",
      }),
    );
  }

  const input = parseChatInput(payload);
  const lastUserMessage = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const conversation = buildConversationTranscript(input.messages);

  if (!lastUserMessage) {
    const fallback = buildFallbackPayload(input, "");
    return NextResponse.json(
      withChatDebug(fallback, {
        diagnostic,
        debug: defaultGeminiDebugInfo(requestId),
        error: "Missing user message. Returned fallback response.",
      }),
    );
  }

  const systemPrompt = buildChatSystemPrompt({
    uiLanguage: input.uiLanguage,
    targetLanguage: input.targetLanguage,
    level: input.level,
    scenario: input.scenario,
  });

  const baseUserPrompt = buildChatUserPrompt({
    lastUserMessage,
    conversation,
    uiLanguage: input.uiLanguage,
    targetLanguage: input.targetLanguage,
    level: input.level,
    scenario: input.scenario,
  });

  const modelResult = await callGeminiJson<unknown>({
    routeName: "api/chat",
    requestId,
    prompt: `System Prompt:\n${systemPrompt}\n\nUser Input:\n${baseUserPrompt}`,
    schema:
      '{"ai_reply":"string","feedback":{"user_original":"string","corrected_version":"string","key_mistakes":["string"],"natural_alternatives":["string"],"grammar_note":"string","improvement_tip":"string"},"score":0}',
    maxOutputTokens: 1024,
    singleFlightParts: {
      language: input.targetLanguage,
      mode: input.mode,
      stepId: input.messages.length,
    },
  });

  if (!modelResult.ok) {
    if (isGeminiRateLimitFailure(modelResult)) {
      return NextResponse.json(buildGeminiRateLimitPayload(modelResult), { status: 429 });
    }
    const fallback = buildFallbackPayload(input, lastUserMessage);
    return NextResponse.json(
      withChatDebug(fallback, {
        diagnostic,
        debug: modelResult.debug,
        error: `Gemini failed (${modelResult.reason}). Using fallback response.`,
      }),
    );
  }

  const normalized = normalizeChatResponse({
    raw: modelResult.data,
    input,
    lastUserMessage,
  });

  if (normalized) {
    return NextResponse.json(
      withChatDebug(normalized, {
        diagnostic,
        debug: modelResult.debug,
      }),
    );
  }

  const fallback = buildFallbackPayload(input, lastUserMessage);
  return NextResponse.json(
    withChatDebug(fallback, {
      diagnostic,
      debug: modelResult.debug,
      error: "Gemini returned invalid payload. Using fallback response.",
    }),
  );
}

