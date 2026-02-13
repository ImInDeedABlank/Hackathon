import { NextResponse } from "next/server";

import {
  buildMockResult,
  buildPlacementUserMessage,
  normalizePlacementResult,
  type PlacementInput,
} from "@/lib/placement";
import { PLACEMENT_SYSTEM_PROMPT } from "@/lib/prompts";

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

function parsePlacementInput(raw: unknown): PlacementInput {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const targetLanguage =
    typeof source.targetLanguage === "string" && source.targetLanguage.trim().length > 0
      ? source.targetLanguage.trim()
      : "English";

  const vocabRaw = source.vocabScore;
  const grammarRaw = source.grammarScore;

  const vocabScore =
    typeof vocabRaw === "number" && Number.isFinite(vocabRaw) ? Math.max(0, Math.min(2, Math.round(vocabRaw))) : 0;
  const grammarScore =
    typeof grammarRaw === "number" && Number.isFinite(grammarRaw)
      ? Math.max(0, Math.min(2, Math.round(grammarRaw)))
      : 0;

  const writingSample = typeof source.writingSample === "string" ? source.writingSample.trim() : "";

  return {
    targetLanguage,
    vocabScore,
    grammarScore,
    writingSample,
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const fallbackInput: PlacementInput = {
      targetLanguage: "English",
      vocabScore: 0,
      grammarScore: 0,
      writingSample: "",
    };
    return NextResponse.json(buildMockResult(fallbackInput));
  }

  const input = parsePlacementInput(payload);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(buildMockResult(input));
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PLACEMENT_SYSTEM_PROMPT },
          { role: "user", content: buildPlacementUserMessage(input) },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(buildMockResult(input));
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(buildMockResult(input));
    }

    const parsed = JSON.parse(content) as unknown;
    return NextResponse.json(normalizePlacementResult(parsed));
  } catch {
    return NextResponse.json(buildMockResult(input));
  }
}
