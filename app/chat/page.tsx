"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ChatBubble from "@/app/components/ChatBubble";
import FeedbackCard, { type MockFeedback } from "@/app/components/FeedbackCard";
import ProgressBar from "@/app/components/ProgressBar";
import {
  STORAGE_KEYS,
  readNumber,
  readString,
  writeNumber,
} from "@/lib/placementStorage";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const MAX_EXCHANGES = 5;

function buildAssistantReply(scenario: string, userText: string, exchangeNumber: number): string {
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

function buildFeedback(userText: string): MockFeedback {
  const trimmed = userText.trim();
  const hasQuestion = trimmed.includes("?");
  const hasCapital = /^[A-Z]/.test(trimmed);

  return {
    corrections: hasCapital ? "Sentence start is good." : "Capitalize the first letter of your sentence.",
    grammarNote: hasQuestion
      ? "Question form detected. Check auxiliary verb order."
      : "Try adding one question to keep the dialog active.",
    naturalPhrasing: `Try: "Could you please help me with ${trimmed.toLowerCase()}?"`,
    score: hasCapital && hasQuestion ? 8 : hasCapital || hasQuestion ? 7 : 6,
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
  const [exchanges, setExchanges] = useState(() => {
    const saved = readNumber(STORAGE_KEYS.sessionExchanges, 0);
    return Math.max(0, Math.min(MAX_EXCHANGES, saved));
  });
  const [feedback, setFeedback] = useState<MockFeedback | null>(null);

  const isComplete = exchanges >= MAX_EXCHANGES;
  const canSend = input.trim().length > 0 && !isComplete;
  const isSpeakMode = selectedMode === "Speak";

  const handleSend = () => {
    if (!canSend) {
      return;
    }

    const userText = input.trim();
    const nextExchange = Math.min(MAX_EXCHANGES, exchanges + 1);
    const assistantReply = buildAssistantReply(selectedScenario, userText, nextExchange);

    setMessages((prev) => {
      const nextId = prev.length + 1;
      return [
        ...prev,
        { id: nextId, role: "user", text: userText },
        { id: nextId + 1, role: "assistant", text: assistantReply },
      ];
    });
    setFeedback(buildFeedback(userText));
    setInput("");
    setExchanges(nextExchange);
    writeNumber(STORAGE_KEYS.sessionExchanges, nextExchange);
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
              placeholder={isComplete ? "Session complete. Open summary." : "Type your next message..."}
              disabled={isComplete}
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
                {t("send")}
              </button>
            </div>
          </div>
        </section>

        {feedback ? <FeedbackCard feedback={feedback} /> : null}
      </div>
    </main>
  );
}
