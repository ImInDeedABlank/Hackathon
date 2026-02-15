"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BrowserRecognitionAlternative = {
  transcript: string;
};

type BrowserRecognitionResult = {
  isFinal: boolean;
  [index: number]: BrowserRecognitionAlternative;
};

type BrowserRecognitionResultList = {
  length: number;
  [index: number]: BrowserRecognitionResult;
};

type BrowserRecognitionEvent = Event & {
  resultIndex: number;
  results: BrowserRecognitionResultList;
};

type BrowserRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

function getSpeechRecognitionConstructor():
  | BrowserSpeechRecognitionConstructor
  | null {
  if (typeof window === "undefined") {
    return null;
  }
  const browserWindow = window as BrowserWindow;
  return (
    browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
  );
}

function toRecognitionError(errorCode: string): string {
  if (errorCode === "not-allowed") {
    return "Microphone permission was denied.";
  }
  if (errorCode === "no-speech") {
    return "Didn't catch that.";
  }
  if (errorCode === "audio-capture") {
    return "No microphone was found.";
  }
  if (errorCode === "network") {
    return "Speech service network error.";
  }
  return "Speech recognition failed.";
}

export function useSpeechRecognition(languageTag: string) {
  const supported =
    typeof window === "undefined" ? true : getSpeechRecognitionConstructor() !== null;
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptRef = useRef(transcript);
  const heardSpeechRef = useRef(false);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new Recognition();
    recognition.lang = languageTag;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      heardSpeechRef.current = false;
      setIsRecording(true);
      setError(null);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      let nextFinal = transcriptRef.current;
      let nextInterim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const chunk = result[0]?.transcript?.trim() ?? "";
        if (!chunk) {
          continue;
        }
        heardSpeechRef.current = true;
        if (result.isFinal) {
          nextFinal = `${nextFinal} ${chunk}`.trim();
        } else {
          nextInterim = `${nextInterim} ${chunk}`.trim();
        }
      }

      transcriptRef.current = nextFinal;
      setTranscript(nextFinal);
      setInterimTranscript(nextInterim);
    };

    recognition.onerror = (event) => {
      setError(toRecognitionError(event.error));
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript("");
      if (!heardSpeechRef.current && !transcriptRef.current.trim()) {
        setError("Didn't catch that.");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Ignore abort issues during cleanup.
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [languageTag]);

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    setError(null);
    setInterimTranscript("");
    try {
      recognitionRef.current.start();
    } catch {
      setError("Could not start microphone.");
    }
  }, [supported]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    try {
      recognitionRef.current.stop();
    } catch {
      setIsRecording(false);
    }
  }, []);

  return {
    supported,
    isRecording,
    transcript,
    interimTranscript,
    start,
    stop,
    setTranscript,
    error: error ?? (supported ? null : "Speech recognition is not supported in this browser."),
  };
}
