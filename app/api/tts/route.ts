import { NextResponse } from "next/server";
import type { protos } from "@google-cloud/text-to-speech";

import { getGoogleTtsClient } from "@/lib/server/googleTtsClient";

export const runtime = "nodejs";

type TargetLanguage = "English" | "Arabic" | "Spanish";
type VoiceStyle = "default" | "calm" | "professional" | "friendly";

type TtsRequest = {
  text: string;
  targetLanguage: TargetLanguage;
  voiceStyle?: VoiceStyle;
  speed?: number;
};

type VoiceProfile = {
  languageCode: string;
  primaryVoice: string;
  fallbackVoice: string;
};

const TARGET_LANGUAGES: TargetLanguage[] = ["English", "Arabic", "Spanish"];
const STYLE_RATE_MULTIPLIER: Record<VoiceStyle, number> = {
  default: 1,
  calm: 0.92,
  professional: 0.98,
  friendly: 1.05,
};

const VOICE_PROFILES: Record<TargetLanguage, VoiceProfile> = {
  English: {
    languageCode: "en-US",
    primaryVoice: "en-US-Neural2-F",
    fallbackVoice: "en-US-Wavenet-D",
  },
  Arabic: {
    languageCode: "ar-XA",
    primaryVoice: "ar-XA-Wavenet-D",
    fallbackVoice: "ar-XA-Standard-A",
  },
  Spanish: {
    languageCode: "es-ES",
    primaryVoice: "es-ES-Neural2-A",
    fallbackVoice: "es-ES-Wavenet-B",
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toTargetLanguage(value: unknown): TargetLanguage {
  if (typeof value === "string" && TARGET_LANGUAGES.includes(value as TargetLanguage)) {
    return value as TargetLanguage;
  }
  return "English";
}

function toVoiceStyle(value: unknown): VoiceStyle {
  if (value === "calm" || value === "professional" || value === "friendly") {
    return value;
  }
  return "default";
}

function parsePayload(raw: unknown): TtsRequest | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const text = typeof source.text === "string" ? source.text.trim() : "";
  if (!text || text.length > 500) {
    return null;
  }

  const targetLanguage = toTargetLanguage(source.targetLanguage);
  const voiceStyle = toVoiceStyle(source.voiceStyle);
  const speed = typeof source.speed === "number" && Number.isFinite(source.speed) ? source.speed : undefined;

  return {
    text,
    targetLanguage,
    voiceStyle,
    speed,
  };
}

function toAudioBuffer(audioContent: Uint8Array | string | null | undefined): Buffer | null {
  if (!audioContent) {
    return null;
  }
  if (typeof audioContent === "string") {
    return Buffer.from(audioContent, "base64");
  }
  return Buffer.from(audioContent);
}

async function synthesizeWithVoiceFallback(
  request: TtsRequest,
): Promise<Buffer> {
  const client = getGoogleTtsClient();
  const profile = VOICE_PROFILES[request.targetLanguage];
  const styleMultiplier = STYLE_RATE_MULTIPLIER[request.voiceStyle ?? "default"];
  const speakingRate = clamp((request.speed ?? 1) * styleMultiplier, 0.25, 4);
  const voicesToTry = [profile.primaryVoice, profile.fallbackVoice];

  let lastError: unknown = null;

  for (const voiceName of voicesToTry) {
    const synthesizeRequest: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { text: request.text },
      voice: {
        languageCode: profile.languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate,
      },
    };

    try {
      const [response] = await client.synthesizeSpeech(synthesizeRequest);
      const buffer = toAudioBuffer(response.audioContent);
      if (!buffer || buffer.length === 0) {
        throw new Error("empty_audio_content");
      }
      return buffer;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("tts_synthesis_failed");
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parsePayload(payload);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid TTS request payload." }, { status: 400 });
  }

  try {
    const audioBuffer = await synthesizeWithVoiceFallback(parsed);
    return new Response(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "TTS generation failed." }, { status: 500 });
  }
}
