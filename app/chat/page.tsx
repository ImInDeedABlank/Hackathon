"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import ChatBubble from "@/app/components/ChatBubble";
import FeedbackCard from "@/app/components/FeedbackCard";
import ProgressBar from "@/app/components/ProgressBar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  getSpeechRecognitionLang,
  getSpeechSynthesisLang,
  getSpeechVoicePrefix,
} from "@/lib/langMap";
import {
  STORAGE_KEYS,
  readNumber,
  readPlacementResult,
  readString,
  writeNumber,
  writeString,
} from "@/lib/placementStorage";
import { validateResponseShape, type ChatResponseShape } from "@/lib/validate";

type ChatMessage = { id: number; role: "assistant" | "user"; text: string };
type UILanguage = "en" | "ar";
type TargetLanguage = "English" | "Arabic" | "Spanish";
type LearnerLevel = "Beginner" | "Intermediate" | "Advanced";
type SupportedScenario =
  | "Airport"
  | "Ordering Food"
  | "Job Interview"
  | "Hotel Check-in"
  | "Doctor Visit";
type SpeakSubMode = "conversation" | "repeat";
type RepeatDifficulty = 1 | 2 | 3;
type TtsEngine = "cloud" | "browser";

type RepeatGenerateResponse = { sentence: string; difficulty: RepeatDifficulty };
type RepeatEvaluateResponse = {
  clarityScore: number;
  transcript: string;
  corrected_version: string;
  tips: string[];
  encouragement: string;
};

const MAX_EXCHANGES = 5;
const TARGET_LANGUAGES: TargetLanguage[] = ["English", "Arabic", "Spanish"];
const LEVELS: LearnerLevel[] = ["Beginner", "Intermediate", "Advanced"];
const SCENARIOS: SupportedScenario[] = [
  "Airport",
  "Ordering Food",
  "Job Interview",
  "Hotel Check-in",
  "Doctor Visit",
];
const GENERIC_REPEAT_TIPS = [
  "Try speaking more clearly.",
  "Slow down slightly.",
  "Pause briefly between words.",
];
const TTS_ENGINE_STORAGE_KEY = "linguasim.ttsEngine";

function toUiLanguage(value: string): UILanguage {
  return value === "ar" ? "ar" : "en";
}
function toTargetLanguage(value: string): TargetLanguage {
  return TARGET_LANGUAGES.includes(value as TargetLanguage)
    ? (value as TargetLanguage)
    : "English";
}
function toLevel(value: string): LearnerLevel {
  return LEVELS.includes(value as LearnerLevel) ? (value as LearnerLevel) : "Beginner";
}
function toScenario(value: string): SupportedScenario {
  return SCENARIOS.includes(value as SupportedScenario)
    ? (value as SupportedScenario)
    : "Ordering Food";
}
function toSpeakSubMode(value: string): SpeakSubMode {
  return value === "repeat" ? "repeat" : "conversation";
}
function toTtsEngine(value: string): TtsEngine {
  return value === "browser" ? "browser" : "cloud";
}
function toRepeatDifficulty(level: LearnerLevel): RepeatDifficulty {
  return level === "Advanced" ? 3 : level === "Intermediate" ? 2 : 1;
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
  return normalized.length > 0 ? normalized.split(" ") : [];
}

function computeClientSimilarityScore(expectedSentence: string, transcript: string): number {
  const expectedWords = tokenize(expectedSentence);
  const spokenWords = tokenize(transcript);
  if (expectedWords.length === 0) {
    return 0;
  }

  const expectedMap = new Map<string, number>();
  const spokenMap = new Map<string, number>();

  for (const word of expectedWords) {
    expectedMap.set(word, (expectedMap.get(word) ?? 0) + 1);
  }
  for (const word of spokenWords) {
    spokenMap.set(word, (spokenMap.get(word) ?? 0) + 1);
  }

  let shared = 0;
  for (const [word, count] of expectedMap.entries()) {
    shared += Math.min(count, spokenMap.get(word) ?? 0);
  }

  const overlap = shared / expectedWords.length;
  const lengthGap = Math.abs(expectedWords.length - spokenWords.length);
  const lengthPenalty = 1 - Math.min(1, lengthGap / Math.max(expectedWords.length, 1));

  return clamp(Math.round((overlap * 0.8 + Math.max(0, lengthPenalty) * 0.2) * 100), 0, 100);
}

function fallbackRepeatSentence(targetLanguage: TargetLanguage, scenario: string, level: LearnerLevel): string {
  const scenarioLower = scenario.toLocaleLowerCase();
  if (targetLanguage === "Arabic") {
    if (scenarioLower.includes("airport")) return "Please tell me my boarding gate number.";
    if (scenarioLower.includes("hotel")) return "I have a reservation for tonight.";
    if (scenarioLower.includes("doctor")) return "I have had a headache since morning.";
    if (scenarioLower.includes("job")) return "I have experience leading project teams.";
    if (level === "Advanced") return "I need clarification before making a final decision.";
    if (level === "Intermediate") return "Could you repeat that sentence more slowly?";
    return "I would like to order a meal.";
  }

  if (targetLanguage === "Spanish") {
    if (scenarioLower.includes("airport")) return "¿Dónde está mi puerta de embarque?";
    if (scenarioLower.includes("hotel")) return "Tengo una reserva para dos noches.";
    if (scenarioLower.includes("doctor")) return "Tengo dolor de garganta desde ayer.";
    if (scenarioLower.includes("job")) return "Tengo experiencia liderando equipos de proyecto.";
    if (level === "Advanced") return "Necesito confirmar los detalles antes de continuar.";
    if (level === "Intermediate") return "¿Puede repetir eso un poco más despacio?";
    return "Quiero pedir una sopa y agua.";
  }

  if (scenarioLower.includes("airport")) return "Where is my boarding gate, please?";
  if (scenarioLower.includes("hotel")) return "I have a reservation for two nights.";
  if (scenarioLower.includes("doctor")) return "I have had a headache since morning.";
  if (scenarioLower.includes("job")) return "I have experience managing project teams.";
  if (level === "Advanced") return "I need clarification before finalizing this decision.";
  if (level === "Intermediate") return "Could you repeat that a little more slowly?";
  return "I would like to order a chicken salad.";
}

function normalizeRepeatGenerateResponse(
  raw: unknown,
  fallback: RepeatGenerateResponse,
): RepeatGenerateResponse {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const sentence =
    typeof source.sentence === "string" && source.sentence.trim().length > 0
      ? source.sentence.trim()
      : fallback.sentence;
  const rawDifficulty = source.difficulty;
  const difficulty: RepeatDifficulty =
    rawDifficulty === 1 || rawDifficulty === 2 || rawDifficulty === 3
      ? rawDifficulty
      : fallback.difficulty;

  return { sentence, difficulty };
}

function fallbackRepeatEvaluation(expectedSentence: string, transcript: string): RepeatEvaluateResponse {
  return {
    clarityScore: computeClientSimilarityScore(expectedSentence, transcript),
    transcript,
    corrected_version: expectedSentence || transcript,
    tips: GENERIC_REPEAT_TIPS,
    encouragement: "Good effort. Keep practicing for clearer pronunciation.",
  };
}

function normalizeRepeatEvaluateResponse(
  raw: unknown,
  fallback: RepeatEvaluateResponse,
): RepeatEvaluateResponse {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const clarityScore =
    typeof source.clarityScore === "number"
      ? clamp(Math.round(source.clarityScore), 0, 100)
      : fallback.clarityScore;
  const transcript =
    typeof source.transcript === "string" && source.transcript.trim().length > 0
      ? source.transcript.trim()
      : fallback.transcript;
  const correctedVersion =
    typeof source.corrected_version === "string" && source.corrected_version.trim().length > 0
      ? source.corrected_version.trim()
      : fallback.corrected_version;
  const encouragement =
    typeof source.encouragement === "string" && source.encouragement.trim().length > 0
      ? source.encouragement.trim()
      : fallback.encouragement;
  const tips = Array.isArray(source.tips)
    ? source.tips
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 3)
    : fallback.tips;

  return {
    clarityScore,
    transcript,
    corrected_version: correctedVersion,
    tips: tips.length > 0 ? tips : fallback.tips,
    encouragement,
  };
}

function scoreBadgeClass(score: number): string {
  if (score >= 85) {
    return "border border-emerald-200 bg-emerald-100 text-emerald-800";
  }
  if (score >= 65) {
    return "border border-amber-200 bg-amber-100 text-amber-800";
  }
  return "border border-rose-200 bg-rose-100 text-rose-800";
}

function buildClientFallback(uiLanguage: UILanguage): ChatResponseShape {
  if (uiLanguage === "ar") {
    return {
      ai_reply: "Let's keep practicing. Try one clearer sentence.",
      feedback: {
        corrected_version: "Good attempt. Keep sentences short and clear.",
        key_mistakes: ["Simplify word order.", "Check verb tense.", "Add one short follow-up question."],
        natural_alternatives: ["Start with a short polite opener.", "Split one long idea into two sentences."],
        grammar_note: "Use one tense consistently in each sentence.",
      },
      score: 6,
    };
  }

  return {
    ai_reply: "Let's keep practicing. Send your next message in a clearer way.",
    feedback: {
      corrected_version: "Good attempt. Use one short and clear sentence.",
      key_mistakes: ["Shorten long sentences.", "Review word order.", "Add one short follow-up question."],
      natural_alternatives: ["Start with a brief polite opener.", "Split one long idea into two sentences."],
      grammar_note: "Keep sentence structure simple.",
    },
    score: 6,
  };
}

function toModeLabel(selectedMode: string): "Speak" | "Text" {
  return selectedMode === "Speak" ? "Speak" : "Text";
}

export default function ChatPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [selectedMode] = useState(() =>
    toModeLabel(readString(STORAGE_KEYS.selectedMode, readString("mode", "Text"))),
  );
  const [selectedScenario] = useState(() =>
    readString(STORAGE_KEYS.selectedScenario, readString("scenario", "Ordering Food")),
  );
  const [speakSubMode, setSpeakSubMode] = useState<SpeakSubMode>(() =>
    toSpeakSubMode(
      readString(STORAGE_KEYS.speakSubMode, readString("speakSubMode", "conversation")),
    ),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 1,
      role: "assistant",
      text:
        selectedMode === "Speak"
          ? `Scenario: ${selectedScenario}. Mode: ${selectedMode} (${speakSubMode === "repeat" ? "Repeat" : "Conversation"}). Send your first message to begin practice.`
          : `Scenario: ${selectedScenario}. Mode: ${selectedMode}. Send your first message to begin practice.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [readRepliesAloud, setReadRepliesAloud] = useState(true);
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>(() =>
    toTtsEngine(readString(TTS_ENGINE_STORAGE_KEY, "cloud")),
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState(() => {
    const saved = readNumber(STORAGE_KEYS.sessionExchanges, 0);
    return Math.max(0, Math.min(MAX_EXCHANGES, saved));
  });
  const [feedback, setFeedback] = useState<ChatResponseShape | null>(null);

  const [repeatSentence, setRepeatSentence] = useState("");
  const [repeatDifficulty, setRepeatDifficulty] = useState<RepeatDifficulty>(1);
  const [isGeneratingRepeatSentence, setIsGeneratingRepeatSentence] = useState(false);
  const [isEvaluatingRepeat, setIsEvaluatingRepeat] = useState(false);
  const [repeatEvaluation, setRepeatEvaluation] = useState<RepeatEvaluateResponse | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

  const targetLanguage = toTargetLanguage(
    readString(STORAGE_KEYS.targetLanguage, readString("targetLanguage", "English")),
  );

  const {
    supported: speechSupported,
    isRecording,
    transcript: speechTranscript,
    interimTranscript: speechInterimTranscript,
    start: startRecording,
    stop: stopRecording,
    setTranscript: setSpeechTranscript,
    error: speechError,
  } = useSpeechRecognition(getSpeechRecognitionLang(targetLanguage));

  const isComplete = exchanges >= MAX_EXCHANGES;
  const isSpeakMode = selectedMode === "Speak";
  const isSpeakConversation = isSpeakMode && speakSubMode === "conversation";
  const isSpeakRepeat = isSpeakMode && speakSubMode === "repeat";
  const isUsingSpeechInput = isSpeakConversation || isSpeakRepeat;
  const activeDraft = isUsingSpeechInput ? speechTranscript : input;
  const canSend = activeDraft.trim().length > 0 && !isComplete && !isSending;
  const canCheckRepeat =
    isSpeakRepeat &&
    repeatSentence.trim().length > 0 &&
    speechTranscript.trim().length > 0 &&
    !isEvaluatingRepeat &&
    !isGeneratingRepeatSentence;
  const speechDraftWithInterim =
    speechInterimTranscript.length > 0
      ? `${speechTranscript} ${speechInterimTranscript}`.trim()
      : speechTranscript;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.src = "";
      audioElementRef.current = null;
    }

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
    };
  }, [stopAudioPlayback]);

  useEffect(() => {
    if (!isUsingSpeechInput && isRecording) {
      stopRecording();
    }
    if (!isSpeakConversation) {
      stopAudioPlayback();
    }
  }, [isUsingSpeechInput, isRecording, isSpeakConversation, stopRecording, stopAudioPlayback]);

  const requestRepeatSentence = useCallback(async () => {
    if (!isSpeakRepeat) {
      return;
    }

    setIsGeneratingRepeatSentence(true);
    setRepeatEvaluation(null);
    setSpeechTranscript("");

    const placement = readPlacementResult();
    const level = toLevel(readString("level", placement?.level ?? "Beginner"));
    const fallback: RepeatGenerateResponse = {
      sentence: fallbackRepeatSentence(targetLanguage, selectedScenario, level),
      difficulty: toRepeatDifficulty(level),
    };

    try {
      const response = await fetch("/api/repeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          targetLanguage,
          level,
          scenario: selectedScenario,
        }),
      });

      if (!response.ok) {
        throw new Error("repeat_generate_http_error");
      }

      const data = (await response.json()) as unknown;
      const normalized = normalizeRepeatGenerateResponse(data, fallback);
      setRepeatSentence(normalized.sentence);
      setRepeatDifficulty(normalized.difficulty);
    } catch {
      setRepeatSentence(fallback.sentence);
      setRepeatDifficulty(fallback.difficulty);
      showToast("Could not generate a new sentence.");
    } finally {
      setIsGeneratingRepeatSentence(false);
    }
  }, [isSpeakRepeat, selectedScenario, setSpeechTranscript, showToast, targetLanguage]);

  useEffect(() => {
    if (!isSpeakRepeat || repeatSentence.trim().length > 0) {
      return;
    }
    void requestRepeatSentence();
  }, [isSpeakRepeat, repeatSentence, requestRepeatSentence]);

  const handleSpeakSubModeChange = (nextMode: SpeakSubMode) => {
    setSpeakSubMode(nextMode);
    writeString(STORAGE_KEYS.speakSubMode, nextMode);
    stopAudioPlayback();
    if (isRecording) {
      stopRecording();
    }
    setSpeechTranscript("");
    setRepeatEvaluation(null);
    if (nextMode === "repeat") {
      setRepeatSentence("");
      setRepeatDifficulty(1);
    }
  };

  const handleTtsEngineChange = (nextValue: string) => {
    const nextEngine = toTtsEngine(nextValue);
    setTtsEngine(nextEngine);
    writeString(TTS_ENGINE_STORAGE_KEY, nextEngine);
    stopAudioPlayback();
  };

  const speakWithBrowserTts = useCallback((text: string, speakLanguage: TargetLanguage): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return false;
    }

    try {
      const synthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(trimmedText);
      utterance.lang = getSpeechSynthesisLang(speakLanguage);

      const voicePrefix = getSpeechVoicePrefix(speakLanguage);
      const matchedVoice = synthesis
        .getVoices()
        .find((voice) => voice.lang.toLowerCase().startsWith(voicePrefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      synthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }, []);

  const speakWithCloudTts = useCallback(
    async (text: string, speakLanguage: TargetLanguage): Promise<boolean> => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            targetLanguage: speakLanguage,
            voiceStyle: "friendly",
          }),
        });

        if (!response.ok) {
          return false;
        }

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          return false;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        audioObjectUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;
        audio.onended = () => {
          if (audioObjectUrlRef.current === audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioObjectUrlRef.current = null;
          }
          if (audioElementRef.current === audio) {
            audioElementRef.current = null;
          }
        };

        await audio.play();
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const speakTextAloud = useCallback(
    async (
      text: string,
      speakLanguage: TargetLanguage,
      options?: {
        respectReadRepliesToggle?: boolean;
      },
    ) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      if (options?.respectReadRepliesToggle && !readRepliesAloud) {
        return;
      }

      stopAudioPlayback();

      if (ttsEngine === "browser") {
        if (!speakWithBrowserTts(trimmedText, speakLanguage)) {
          showToast(t("tts_unavailable"));
        }
        return;
      }

      const playedCloudAudio = await speakWithCloudTts(trimmedText, speakLanguage);
      if (playedCloudAudio) {
        return;
      }

      if (!speakWithBrowserTts(trimmedText, speakLanguage)) {
        showToast(t("tts_unavailable"));
      }
    },
    [readRepliesAloud, showToast, speakWithBrowserTts, speakWithCloudTts, stopAudioPlayback, t, ttsEngine],
  );

  const handleSpeakTextClick = useCallback(
    (text: string) => {
      if (!isSpeakMode) {
        return;
      }
      void speakTextAloud(text, targetLanguage);
    },
    [isSpeakMode, speakTextAloud, targetLanguage],
  );

  const handleMicClick = () => {
    if (!isSpeakMode) {
      return;
    }

    if (!speechSupported) {
      showToast(t("speech_not_supported"));
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    if (isSpeakRepeat) {
      setSpeechTranscript("");
      setRepeatEvaluation(null);
    }

    startRecording();
  };

  const handleRepeatTryAgain = () => {
    if (isRecording) {
      stopRecording();
    }
    setSpeechTranscript("");
    setRepeatEvaluation(null);
  };

  const handleCheckClarity = async () => {
    if (!isSpeakRepeat) {
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    const transcript = speechTranscript.trim();
    if (!transcript) {
      showToast(t("didnt_catch_that"));
      return;
    }

    setIsEvaluatingRepeat(true);
    const fallback = fallbackRepeatEvaluation(repeatSentence, transcript);

    try {
      const response = await fetch("/api/repeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "evaluate",
          targetLanguage,
          expectedSentence: repeatSentence,
          transcript,
        }),
      });

      if (!response.ok) {
        throw new Error("repeat_evaluate_http_error");
      }

      const data = (await response.json()) as unknown;
      setRepeatEvaluation(normalizeRepeatEvaluateResponse(data, fallback));
    } catch {
      setRepeatEvaluation(fallback);
      showToast("Could not evaluate with AI. Showing basic feedback.");
    } finally {
      setIsEvaluatingRepeat(false);
    }
  };

  const handleSend = async () => {
    if (isSpeakRepeat || !canSend) {
      return;
    }

    if (isSpeakConversation && isRecording) {
      stopRecording();
    }

    const userText = (isSpeakConversation ? speechTranscript : input).trim();
    if (!userText) {
      return;
    }

    const nextExchange = Math.min(MAX_EXCHANGES, exchanges + 1);
    const userMessage = { role: "user" as const, content: userText };
    const history = messages
      .slice(1)
      .map((message) => ({ role: message.role, content: message.text }))
      .concat(userMessage);

    setMessages((prev) => {
      const nextId = prev.length + 1;
      return [...prev, { id: nextId, role: "user", text: userText }];
    });

    if (isSpeakConversation) {
      setSpeechTranscript("");
    } else {
      setInput("");
    }

    setIsSending(true);

    const uiLanguage = toUiLanguage(readString(STORAGE_KEYS.uiLanguage, "en"));
    const currentTargetLanguage = toTargetLanguage(
      readString(STORAGE_KEYS.targetLanguage, readString("targetLanguage", "English")),
    );
    const placement = readPlacementResult();
    const level = toLevel(readString("level", placement?.level ?? "Beginner"));
    const scenario = toScenario(
      readString(
        STORAGE_KEYS.selectedScenario,
        readString("scenario", selectedScenario),
      ),
    );

    let didCompleteExchange = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uiLanguage,
          targetLanguage: currentTargetLanguage,
          level,
          scenario,
          mode: isSpeakMode ? "Speak" : "Text",
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

      if (isSpeakConversation) {
        void speakTextAloud(data.ai_reply, currentTargetLanguage, {
          respectReadRepliesToggle: true,
        });
      }

      didCompleteExchange = true;
    } catch {
      if (isSpeakConversation) {
        setMessages((prev) => prev.slice(0, -1));
        setSpeechTranscript(userText);
      } else {
        const fallback = buildClientFallback(uiLanguage);
        setMessages((prev) => {
          const nextId = prev.length + 1;
          return [...prev, { id: nextId, role: "assistant", text: fallback.ai_reply }];
        });
        setFeedback(fallback);
        didCompleteExchange = true;
      }
      showToast("Could not reach AI service.");
    } finally {
      setIsSending(false);
      if (didCompleteExchange) {
        setExchanges(nextExchange);
        writeNumber(STORAGE_KEYS.sessionExchanges, nextExchange);
      }
    }
  };

  const isRtl = lang === "ar";
  const normalizedSpeechError =
    speechError === "Didn't catch that." ? t("didnt_catch_that") : speechError;

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
          {isSpeakMode ? (
            <div className="theme-panel-soft inline-flex gap-2 rounded-xl p-1">
              <button
                type="button"
                onClick={() => handleSpeakSubModeChange("conversation")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${speakSubMode === "conversation" ? "btn-glow" : "btn-outline"}`}
              >
                {t("chat_tab_conversation")}
              </button>
              <button
                type="button"
                onClick={() => handleSpeakSubModeChange("repeat")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${speakSubMode === "repeat" ? "btn-glow" : "btn-outline"}`}
              >
                {t("chat_tab_repeat")}
              </button>
            </div>
          ) : null}
          <ProgressBar current={exchanges} total={MAX_EXCHANGES} label="Session progress" />
        </header>

        <section className="theme-panel rounded-2xl p-5 backdrop-blur sm:p-6">
          {isSpeakRepeat ? (
            <div className="space-y-4">
              <div className="theme-panel-soft rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">{t("repeat_sentence_label")}</p>
                <button
                  type="button"
                  onClick={() => void speakTextAloud(repeatSentence, targetLanguage)}
                  disabled={isGeneratingRepeatSentence || repeatSentence.trim().length === 0}
                  className={`mt-2 w-full rounded-lg text-lg font-semibold text-slate-900 transition ${isRtl ? "text-right" : "text-left"} hover:bg-slate-100/80 disabled:cursor-not-allowed disabled:opacity-70`}
                  title={t("read_replies_aloud")}
                >
                  {isGeneratingRepeatSentence ? t("generating_sentence") : repeatSentence}
                </button>
                <p className="mt-2 text-xs text-slate-500">Difficulty {repeatDifficulty}/3</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                  onClick={handleMicClick}
                  disabled={isGeneratingRepeatSentence}
                >
                  {isRecording ? t("stop_mic") : t("start_mic")}
                </button>
                <button
                  type="button"
                  onClick={() => void requestRepeatSentence()}
                  disabled={isGeneratingRepeatSentence || isEvaluatingRepeat}
                  className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("new_sentence")}
                </button>
                <button
                  type="button"
                  onClick={stopAudioPlayback}
                  className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                >
                  {t("stop_audio")}
                </button>
              </div>

              {!speechSupported ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {t("speech_not_supported")}
                </div>
              ) : null}

              <textarea
                value={speechDraftWithInterim}
                onChange={(event) => setSpeechTranscript(event.target.value)}
                placeholder={t("repeat_transcript_placeholder")}
                disabled={isGeneratingRepeatSentence || isEvaluatingRepeat}
                className={`w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 ${isRtl ? "text-right" : "text-left"}`}
              />

              {normalizedSpeechError ? (
                <p className="text-xs text-amber-700">{normalizedSpeechError}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {isEvaluatingRepeat ? (
                  <p className="self-center text-xs font-medium text-slate-500">
                    {t("checking_clarity")}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleRepeatTryAgain}
                  className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                >
                  {t("try_again")}
                </button>
                <button
                  type="button"
                  onClick={handleCheckClarity}
                  disabled={!canCheckRepeat}
                  className="btn-glow rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEvaluatingRepeat ? t("checking_clarity") : t("check_clarity")}
                </button>
              </div>

              {repeatEvaluation ? (
                <article className="theme-panel-soft rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                      {t("clarity_score_label")}
                    </p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${scoreBadgeClass(repeatEvaluation.clarityScore)}`}>
                      {repeatEvaluation.clarityScore}%
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div>
                      <p className="font-semibold text-slate-900">{t("you_said_label")}</p>
                      <button
                        type="button"
                        onClick={() => void speakTextAloud(repeatEvaluation.transcript, targetLanguage)}
                        className={`w-full rounded-md px-2 py-1 transition hover:bg-slate-100 ${isRtl ? "text-right" : "text-left"}`}
                      >
                        {repeatEvaluation.transcript}
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{t("corrected_version_label")}</p>
                      <button
                        type="button"
                        onClick={() => void speakTextAloud(repeatEvaluation.corrected_version, targetLanguage)}
                        className={`w-full rounded-md px-2 py-1 transition hover:bg-slate-100 ${isRtl ? "text-right" : "text-left"}`}
                      >
                        {repeatEvaluation.corrected_version}
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{t("pronunciation_tips_title")}</p>
                      <ul className="mt-1 list-disc space-y-1 ps-5">
                        {repeatEvaluation.tips.map((tip, index) => (
                          <li key={`${tip}-${index}`}>
                            <button
                              type="button"
                              onClick={() => void speakTextAloud(tip, targetLanguage)}
                              className={`w-full rounded-md px-1 py-0.5 transition hover:bg-slate-100 ${isRtl ? "text-right" : "text-left"}`}
                            >
                              {tip}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{t("encouragement_label")}</p>
                      <button
                        type="button"
                        onClick={() => void speakTextAloud(repeatEvaluation.encouragement, targetLanguage)}
                        className={`w-full rounded-md px-2 py-1 transition hover:bg-slate-100 ${isRtl ? "text-right" : "text-left"}`}
                      >
                        {repeatEvaluation.encouragement}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleRepeatTryAgain}
                      className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                    >
                      {t("try_again")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestRepeatSentence()}
                      disabled={isGeneratingRepeatSentence}
                      className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t("new_sentence")}
                    </button>
                  </div>
                </article>
              ) : null}
            </div>
          ) : (
            <>
              <div className="max-h-[22rem] space-y-3 overflow-y-auto pe-1">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    role={message.role}
                    text={message.text}
                    onClick={isSpeakMode ? () => handleSpeakTextClick(message.text) : undefined}
                    clickLabel={t("read_replies_aloud")}
                  />
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {isSpeakMode ? (
                  <button
                    type="button"
                    className="btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                    onClick={handleMicClick}
                    disabled={isComplete}
                  >
                    {isRecording ? t("stop_mic") : t("start_mic")}
                  </button>
                ) : null}

                {isSpeakConversation ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={readRepliesAloud}
                          onChange={(event) => {
                            const nextValue = event.target.checked;
                            setReadRepliesAloud(nextValue);
                            if (!nextValue) {
                              stopAudioPlayback();
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        {t("read_replies_aloud")}
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600" htmlFor="tts-engine">
                          {t("tts_engine")}
                        </label>
                        <select
                          id="tts-engine"
                          value={ttsEngine}
                          onChange={(event) => handleTtsEngineChange(event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                          <option value="cloud">{t("tts_engine_cloud")}</option>
                          <option value="browser">{t("tts_engine_browser")}</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopAudioPlayback}
                      className="btn-outline rounded-xl px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5"
                    >
                      {t("stop_audio")}
                    </button>
                  </div>
                ) : null}

                {isSpeakConversation && !speechSupported ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {t("speech_not_supported")}
                  </div>
                ) : null}

                <textarea
                  value={isSpeakConversation ? speechDraftWithInterim : input}
                  onChange={(event) =>
                    isSpeakConversation ? setSpeechTranscript(event.target.value) : setInput(event.target.value)
                  }
                  placeholder={
                    isComplete
                      ? "Session complete. Open summary."
                      : isSending
                        ? t("thinking")
                        : isSpeakConversation
                          ? "Speak with mic, then edit transcript if needed..."
                          : "Type your next message..."
                  }
                  disabled={isComplete || isSending}
                  className={`w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 ${isRtl ? "text-right" : "text-left"}`}
                />

                {isSpeakConversation && normalizedSpeechError ? (
                  <p className="text-xs text-amber-700">{normalizedSpeechError}</p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {isSending ? (
                    <p className="self-center text-xs font-medium text-slate-500">
                      {t("thinking")}
                    </p>
                  ) : null}
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
                    {isSending ? t("thinking") : t("send")}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {feedback && !isSpeakRepeat ? (
          <FeedbackCard feedback={feedback.feedback} score={feedback.score} />
        ) : null}
      </div>
      {toastMessage ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 shadow-md">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}

