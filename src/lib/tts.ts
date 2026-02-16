let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function normalizeLangPrefix(langCode: string): string {
  return langCode.toLowerCase().split("-")[0] ?? langCode.toLowerCase();
}

function resolveVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!hasSpeechSynthesis()) {
    return Promise.resolve([]);
  }

  if (voicesReadyPromise) {
    return voicesReadyPromise;
  }

  voicesReadyPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const timeout = window.setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(synth.getVoices());
    }, 1200);

    const onVoicesChanged = () => {
      window.clearTimeout(timeout);
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(synth.getVoices());
    };

    synth.addEventListener("voiceschanged", onVoicesChanged);
  });

  return voicesReadyPromise;
}

function pickVoice(voices: SpeechSynthesisVoice[], langCode: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }
  const full = langCode.toLowerCase();
  const prefix = normalizeLangPrefix(langCode);
  return (
    voices.find((voice) => voice.lang.toLowerCase() === full) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
}

export function isTtsSupported(): boolean {
  return hasSpeechSynthesis();
}

export function stop(): void {
  if (!hasSpeechSynthesis()) {
    return;
  }
  window.speechSynthesis.cancel();
}

export async function speak(text: string, langCode: string): Promise<void> {
  if (!hasSpeechSynthesis()) {
    throw new Error("tts_unsupported");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const synth = window.speechSynthesis;
  stop();

  const voices = await resolveVoices();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = langCode;

  const chosen = pickVoice(voices, langCode);
  if (chosen) {
    utterance.voice = chosen;
  }

  await new Promise<void>((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("tts_playback_failed"));
    synth.speak(utterance);
  });
}

