import { NextResponse } from "next/server";

import { generateVideoRecommendations } from "@/lib/server/geminiRecommendations";
import { normalizePlacementProfile } from "@/lib/server/placementProfile";
import { buildQueryIntents, fetchRecommendedVideos } from "@/lib/server/videoProvider";
import type { LearningVideosApiResponse, LearningVideosRequestBody } from "@/types/learningVideos";

const CACHE_TTL_MS = 1000 * 60 * 15;
const CACHE_SCHEMA_VERSION = "v2";

type UnlockedLearningVideosResponse = Extract<LearningVideosApiResponse, { locked: false }>;
type CacheEntry = {
  expiresAt: number;
  response: UnlockedLearningVideosResponse;
};

const recommendationCache = new Map<string, CacheEntry>();

function cacheKeyFor(input: {
  userId: string;
  language: string;
  level: string;
}): string {
  return `${CACHE_SCHEMA_VERSION}|${input.userId}|${input.language}|${input.level}`;
}

function readFromCache(key: string): UnlockedLearningVideosResponse | null {
  const entry = recommendationCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    recommendationCache.delete(key);
    return null;
  }
  return entry.response;
}

function storeInCache(key: string, response: UnlockedLearningVideosResponse): void {
  recommendationCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    response,
  });
}

function buildWeeklyPlan(topics: string[], level: string): string[] {
  const first = topics[0] ?? "Core foundations";
  const second = topics[1] ?? "Guided practice";
  const third = topics[2] ?? "Applied communication";
  const intensity = level === "A1" || level === "A2" ? "15-20 minutes" : "20-30 minutes";

  return [
    `Day 1: Watch ${first} for ${intensity} and note 5 key phrases.`,
    `Day 3: Study ${second} and pause to repeat explanations aloud.`,
    `Day 5: Use ${third} in a short speaking or writing practice task.`,
    "Day 7: Review one saved video, summarize key points, and self-check progress.",
  ];
}

function lockedResponse(message: string): LearningVideosApiResponse {
  return {
    locked: true,
    message,
    source: {
      cacheHit: false,
      usedGemini: false,
      usedYouTube: false,
      usedFallbackTopics: false,
      usedFallbackVideos: false,
    },
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      lockedResponse("Learning Videos unlock after completing placement."),
      { status: 400 },
    );
  }

  const profile = normalizePlacementProfile(payload as LearningVideosRequestBody);
  if (!profile.completed) {
    return NextResponse.json(lockedResponse("Learning Videos unlock after placement."), { status: 200 });
  }

  const key = cacheKeyFor({
    userId: profile.userId,
    language: profile.selectedLanguage,
    level: profile.cefrLevel,
  });

  const cached = readFromCache(key);
  if (cached) {
    return NextResponse.json({
      ...cached,
      source: {
        ...cached.source,
        cacheHit: true,
      },
    } satisfies LearningVideosApiResponse);
  }

  const recommendationResult = await generateVideoRecommendations(profile);
  const queryIntents = buildQueryIntents(
    recommendationResult.recommendation.recommendedTopics,
    profile.cefrLevel,
  );

  const videoResult = await fetchRecommendedVideos({
    intents: queryIntents,
    relevanceLanguage: profile.selectedLanguageCode,
  });

  if (recommendationResult.error) {
    console.warn(`[api/learning-videos] recommendation warning="${recommendationResult.error}"`);
  }
  if (videoResult.error) {
    console.warn(`[api/learning-videos] video warning="${videoResult.error}"`);
  }

  const response: UnlockedLearningVideosResponse = {
    locked: false,
    profile,
    learnerProfileSummary: recommendationResult.recommendation.learnerProfileSummary,
    recommendedTopics: recommendationResult.recommendation.recommendedTopics,
    pacingAdvice: recommendationResult.recommendation.pacingAdvice,
    weeklyPlanHint: recommendationResult.recommendation.weeklyPlanHint,
    weeklyPlan: buildWeeklyPlan(
      recommendationResult.recommendation.recommendedTopics.map((item) => item.topic),
      profile.cefrLevel,
    ),
    videos: videoResult.videos,
    source: {
      cacheHit: false,
      usedGemini: recommendationResult.usedGemini,
      usedYouTube: videoResult.usedYouTube,
      usedFallbackTopics: recommendationResult.usedFallbackTopics,
      usedFallbackVideos: videoResult.usedFallbackVideos,
    },
  };

  storeInCache(key, response);
  return NextResponse.json(response satisfies LearningVideosApiResponse);
}
