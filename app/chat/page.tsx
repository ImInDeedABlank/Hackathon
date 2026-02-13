"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ChatBubble from "@/app/components/ChatBubble";
import FeedbackCard, { type MockFeedback } from "@/app/components/FeedbackCard";
import { STORAGE_KEYS, readString, writeNumber } from "@/lib/placementStorage";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const SCENARIO_RESPONSES: Record<string, string[]> = {
  Airport: [
    "Great start. At check-in, you can say: I would like to check my bag.",
    "Nice. Try asking: Which gate does this flight depart from?",
    "Good question style. You can also say: Is the flight on time?",
  ],
  "Ordering Food": [
    "Nice order. You can ask: Could I see the menu, please?",
    "Great. A natural phrase is: Can I get this without onions?",
    "Good. You might also say: Could we have the bill, please?",
  ],
  "Job Interview": [
    "Good opening. Try: I have three years of experience in support.",
    "Strong answer. You can add: I enjoy solving customer problems.",
    "Nice. A clear phrase is: I am excited to contribute to your team.",
  ],
  "Hotel Check-in": [
    "Good start. Try: I have a reservation under my name.",
    "Nice. You can ask: Is breakfast included with the room?",
    "Great. Another useful phrase: Could I have a late checkout?",
  ],
  "Doctor Visit": [
    "Good description. You can say: I have had this pain for two days.",
    "Nice. Try asking: Should I take this medicine after meals?",
    "Good question. A natural phrase is: When should I come back for a follow-up?",
  ],
};

function buildFeedback(message: string): MockFeedback {
  const score = Math.floor(Math.random() * 4) + 6;
  return {
    corrections: `Try this correction: "${message.trim() || "I would like some help, please."}" with cleaner tense consistency.`,
    grammarNote: "Focus on subject-verb agreement and article usage in short requests.",
    naturalPhrasing: "Use polite connectors like 'could I' and 'would you mind' for smoother conversation.",
    score,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const mode = readString(STORAGE_KEYS.selectedMode, "Text");
  const scenario = readString(STORAGE_KEYS.selectedScenario, "Ordering Food");

  const initialAssistant = useMemo<Message>(
    () => ({
      id: "assistant-initial",
      role: "assistant",
      text: `Scenario: ${scenario}. Start the conversation whenever you're ready.`,
    }),
    [scenario],
  );

  const [messages, setMessages] = useState<Message[]>([initialAssistant]);
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<MockFeedback | null>(null);
  const [exchangeCount, setExchangeCount] = useState(1);

  const handleSend = () => {
    const userText = (mode === "Speak" ? transcript : input).trim();
    if (!userText) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
    };

    const variants = SCENARIO_RESPONSES[scenario] ?? SCENARIO_RESPONSES["Ordering Food"];
    const aiText = variants[(exchangeCount - 1) % variants.length];
    const assistantMessage: Message = {
      id: `assistant-${Date.now() + 1}`,
      role: "assistant",
      text: aiText,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setFeedback(buildFeedback(userText));
    setInput("");
    setTranscript("");
    setExchangeCount((prev) => {
      const next = Math.min(5, prev + 1);
      writeNumber(STORAGE_KEYS.sessionExchanges, next);
      return next;
    });
  };

  const handleEndSession = () => {
    writeNumber(STORAGE_KEYS.sessionExchanges, exchangeCount);
    router.push("/summary");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">{mode} Mode</p>
              <h1 className="text-xl font-semibold text-slate-900">{scenario}</h1>
            </div>
            <p className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              {exchangeCount}/5 exchanges
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:p-5">
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatBubble key={message.id} role={message.role} text={message.text} />
            ))}
          </div>
        </section>

        {mode === "Speak" ? (
          <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:p-5">
            <p className="text-sm font-medium text-slate-800">Mock microphone input</p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTranscript("Hello, I need help with my booking.")}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                🎤 Tap to Record
              </button>
              <span className="text-xs text-slate-500">Mock only</span>
            </div>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Transcript appears here..."
              className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </section>
        ) : (
          <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:p-5">
            <label htmlFor="chat-input" className="text-sm font-medium text-slate-800">
              Type your message
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a reply..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </section>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleEndSession}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            End Session
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Send
          </button>
        </div>

        {feedback ? <FeedbackCard feedback={feedback} /> : null}
      </div>
    </main>
  );
}
