"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ChatBubble from "@/app/components/ChatBubble";
import FeedbackCard from "@/app/components/FeedbackCard";
import ProgressBar from "@/app/components/ProgressBar";
import {
  STORAGE_KEYS,
  readNumber,
  readPlacementResult,
  readString,
  writeNumber,
} from "@/lib/placementStorage";
import { validateResponseShape, type ChatResponseShape } from "@/lib/validate";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const MAX_EXCHANGES = 5;

type UILanguage = "en" | "ar";
type TargetLanguage = "English" | "Arabic" | "Spanish";
type LearnerLevel = "Beginner" | "Intermediate" | "Advanced";
type SupportedScenario = "Airport" | "Ordering Food" | "Job Interview" | "Hotel Check-in" | "Doctor Visit";

const TARGET_LANGUAGES: TargetLanguage[] = ["English", "Arabic", "Spanish"];
const LEVELS: LearnerLevel[] = ["Beginner", "Intermediate", "Advanced"];
const SCENARIOS: SupportedScenario[] = [
  "Airport",
  "Ordering Food",
  "Job Interview",
  "Hotel Check-in",
  "Doctor Visit",
];

function toUiLanguage(value: string): UILanguage {
  return value === "ar" ? "ar" : "en";
}

function toTargetLanguage(value: string): TargetLanguage {
  return TARGET_LANGUAGES.includes(value as TargetLanguage) ? (value as TargetLanguage) : "English";
}

function toLevel(value: string): LearnerLevel {
  return LEVELS.includes(value as LearnerLevel) ? (value as LearnerLevel) : "Beginner";
}

function toScenario(value: string): SupportedScenario {
  return SCENARIOS.includes(value as SupportedScenario) ? (value as SupportedScenario) : "Ordering Food";
}

function buildSpeakModeReply(scenario: string, userText: string, exchangeNumber: number): string {
  const lower = userText.toLowerCase();

  if (scenario.toLowerCase().includes("job") && lower.includes("experience")) {
    return "Good detail. Add one measurable result from that experience to sound stronger.";
  }
  if (scenario.toLowerCase().includes("airport") && lower.includes("ticket")) {
    return "Nice. Now ask a follow-up question about baggage or gate information.";
  }
  if (scenario.toLowerCase().includes("hotel") && lower.includes("reservation")) {
    return "Clear request. Include your dates and ask for confirmation to make it complete.";
  }
  return `Good attempt for ${scenario}. Keep the sentence clear and add one follow-up question in your next message (turn ${exchangeNumber}/${MAX_EXCHANGES}).`;
}

function buildSpeakModeResponse(scenario: string, userText: string, exchangeNumber: number): ChatResponseShape {
  const trimmed = userText.trim();
  const hasQuestion = trimmed.includes("?");
  const hasCapital = /^[A-Z]/.test(trimmed);

  return {
    ai_reply: buildSpeakModeReply(scenario, userText, exchangeNumber),
    feedback: {
      corrected_version: hasCapital ? "Sentence start is good." : "Capitalize the first letter of your sentence.",
      key_mistakes: [
        "Keep verb tense consistent.",
        "Use simple sentence order for clarity.",
        "Add one follow-up question in your next turn.",
      ],
      natural_alternatives: [
        `Try: "Could you please help me with ${trimmed.toLowerCase()}?"`,
        "Use one short sentence, then add one detail.",
      ],
      grammar_note: hasQuestion
        ? "Question form detected. Check auxiliary verb order."
        : "Try adding one question to keep the dialog active.",
    },
    score: hasCapital && hasQuestion ? 8 : hasCapital || hasQuestion ? 7 : 6,
  };
}

function buildClientFallback(uiLanguage: UILanguage): ChatResponseShape {
  if (uiLanguage === "ar") {
    return {
      ai_reply:
        "\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0643. \u0645\u0627\u0630\u0627 \u062a\u0648\u062f \u0623\u0646 \u062a\u0637\u0644\u0628 \u0627\u0644\u064a\u0648\u0645\u061f \u0644\u062f\u064a\u0646\u0627 \u0623\u064a\u0636\u064b\u0627 \u0639\u0631\u0636 \u0627\u0644\u063a\u062f\u0627\u0621.",
      feedback: {
        corrected_version:
          "\u0631\u062f\u0651\u0643 \u0648\u0627\u0636\u062d. \u062c\u0631\u0651\u0628 \u0625\u0636\u0627\u0641\u0629 \u062a\u0641\u0635\u064a\u0644 \u0635\u063a\u064a\u0631 \u064a\u0646\u0627\u0633\u0628 \u0627\u0644\u0633\u064a\u0627\u0642.",
        key_mistakes: [
          "\u0627\u0633\u062a\u062e\u062f\u0645 \u062a\u0631\u062a\u064a\u0628 \u0643\u0644\u0645\u0627\u062a \u0623\u0628\u0633\u0637 \u0639\u0646\u062f \u0627\u0644\u0634\u0643.",
          "\u0631\u0627\u062c\u0639 \u062a\u0635\u0631\u064a\u0641 \u0627\u0644\u0641\u0639\u0644 \u0645\u0639 \u0627\u0644\u0641\u0627\u0639\u0644 \u0641\u064a \u0627\u0644\u062c\u0645\u0644\u0629.",
          "\u0623\u0636\u0641 \u0633\u0624\u0627\u0644 \u0645\u062a\u0627\u0628\u0639\u0629 \u0642\u0635\u064a\u0631\u064b\u0627 \u0644\u0644\u062d\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u062d\u0648\u0627\u0631.",
        ],
        natural_alternatives: [
          "\u0627\u0633\u062a\u062e\u062f\u0645 \u0639\u0628\u0627\u0631\u0629 \u0645\u0647\u0630\u0628\u0629 \u0623\u0642\u0635\u0631 \u0642\u0628\u0644 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0623\u0633\u0627\u0633\u064a.",
          "\u0642\u0633\u0651\u0645 \u0627\u0644\u062c\u0645\u0644\u0629 \u0627\u0644\u0637\u0648\u064a\u0644\u0629 \u0625\u0644\u0649 \u062c\u0645\u0644\u062a\u064a\u0646 \u0623\u0648 \u062b\u0644\u0627\u062b \u062c\u0645\u0644 \u0642\u0635\u064a\u0631\u0629.",
        ],
        grammar_note:
          "\u062d\u0627\u0641\u0638 \u0639\u0644\u0649 \u0632\u0645\u0646 \u0648\u0627\u062d\u062f \u0641\u064a \u0627\u0644\u062c\u0645\u0644\u0629 \u0646\u0641\u0633\u0647\u0627 \u0644\u062a\u0628\u0642\u0649 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0623\u0648\u0636\u062d.",
      },
      score: 6,
    };
  }

  return {
    ai_reply: "Let's keep practicing. Send your next message in a shorter, clearer way.",
    feedback: {
      corrected_version: "Good attempt. Use one short and clear sentence.",
      key_mistakes: [
        "Shorten long sentences to reduce mistakes.",
        "Review basic word order.",
        "Add one short follow-up question.",
      ],
      natural_alternatives: [
        "Start with a brief polite opener.",
        "Split one long idea into two sentences.",
      ],
      grammar_note: "Keep sentence structure simple to improve accuracy.",
    },
    score: 6,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [selectedMode] = useState(() => readString(STORAGE_KEYS.selectedMode, "Text"));
  const [selectedScenario] = useState(() => readString(STORAGE_KEYS.selectedScenario, "Ordering Food"));
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 1,
      role: "assistant",
      text: `Scenario: ${selectedScenario}. Mode: ${selectedMode}. Send your first message to begin practice.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState(() => {
    const saved = readNumber(STORAGE_KEYS.sessionExchanges, 0);
    return Math.max(0, Math.min(MAX_EXCHANGES, saved));
  });
  const [feedback, setFeedback] = useState<ChatResponseShape | null>(null);

  const isComplete = exchanges >= MAX_EXCHANGES;
  const canSend = input.trim().length > 0 && !isComplete && !isSending;
  const isSpeakMode = selectedMode === "Speak";

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const userText = input.trim();
    const nextExchange = Math.min(MAX_EXCHANGES, exchanges + 1);
    const userMessage = { role: "user" as const, content: userText };

    setMessages((prev) => {
      const nextId = prev.length + 1;
      return [...prev, { id: nextId, role: "user", text: userText }];
    });
    setInput("");

    if (isSpeakMode) {
      const speakResult = buildSpeakModeResponse(selectedScenario, userText, nextExchange);
      setMessages((prev) => {
        const nextId = prev.length + 1;
        return [...prev, { id: nextId, role: "assistant", text: speakResult.ai_reply }];
      });
      setFeedback(speakResult);
      setExchanges(nextExchange);
      writeNumber(STORAGE_KEYS.sessionExchanges, nextExchange);
      return;
    }

    setIsSending(true);

    const uiLanguage = toUiLanguage(readString(STORAGE_KEYS.uiLanguage, "en"));
    const targetLanguage = toTargetLanguage(readString(STORAGE_KEYS.targetLanguage, "English"));
    const placement = readPlacementResult();
    const level = toLevel(placement?.level ?? "Beginner");
    const scenario = toScenario(readString(STORAGE_KEYS.selectedScenario, selectedScenario));

    const history = messages
      .slice(1)
      .map((message) => ({ role: message.role, content: message.text }))
      .concat(userMessage);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uiLanguage,
          targetLanguage,
          level,
          scenario,
          messages: history,
        }),
      });

      if (!response.ok) {
        throw new Error("chat_api_http_error");
      }

      const data = (await response.json()) as unknown;
      if (!validateResponseShape(data)) {
        throw new Error("chat_api_shape_error");
      }

      setMessages((prev) => {
        const nextId = prev.length + 1;
        return [...prev, { id: nextId, role: "assistant", text: data.ai_reply }];
      });
      setFeedback(data);
    } catch {
      const fallback = buildClientFallback(uiLanguage);
      setMessages((prev) => {
        const nextId = prev.length + 1;
        return [...prev, { id: nextId, role: "assistant", text: fallback.ai_reply }];
      });
      setFeedback(fallback);
      showToast("Could not reach AI service.");
    } finally {
      setIsSending(false);
      setExchanges(nextExchange);
      writeNumber(STORAGE_KEYS.sessionExchanges, nextExchange);
    }
  };

  const isRtl = lang === "ar";

  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className={`theme-panel space-y-3 rounded-2xl p-5 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{t("chat_title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{selectedScenario}</h1>
          <p className="text-sm text-slate-600">
            {t("mode_title")}: <span className="font-semibold text-slate-900">{isSpeakMode ? t("speak_mode") : t("text_mode")}</span>
          </p>
          <ProgressBar current={exchanges} total={MAX_EXCHANGES} label="Session progress" />
        </header>

        <section className="theme-panel rounded-2xl p-5 backdrop-blur sm:p-6">
          <div className="max-h-[22rem] space-y-3 overflow-y-auto pe-1">
            {messages.map((message) => (
              <ChatBubble key={message.id} role={message.role} text={message.text} />
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {isSpeakMode ? (
              <button
                type="button"
                className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                onClick={() => setInput((current) => current || "I need help with my booking details.")}
                disabled={isComplete}
              >
                {t("mic")}
              </button>
            ) : null}
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isComplete ? "Session complete. Open summary." : isSending ? "Thinking..." : "Type your next message..."}
              disabled={isComplete || isSending}
              className={`w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 ${isRtl ? "text-right" : "text-left"}`}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/summary")}
                className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                {t("view_summary")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/summary")}
                className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                {t("end_session")}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "..." : t("send")}
              </button>
            </div>
          </div>
        </section>

        {feedback ? <FeedbackCard feedback={feedback.feedback} score={feedback.score} /> : null}
      </div>
      {toastMessage ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 shadow-md">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
