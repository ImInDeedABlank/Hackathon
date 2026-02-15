import type { LearningVideosApiResponse, LearningVideosRequestBody } from "@/types/learningVideos";

export async function fetchLearningVideosRecommendations(
  payload: LearningVideosRequestBody,
  signal?: AbortSignal,
): Promise<LearningVideosApiResponse> {
  const response = await fetch("/api/learning-videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  let data: unknown = null;
  try {
    data = (await response.json()) as unknown;
  } catch {
    throw new Error("Failed to parse learning video response.");
  }

  if (!response.ok) {
    throw new Error("Learning video recommendations unavailable.");
  }

  if (!data || typeof data !== "object" || typeof (data as { locked?: unknown }).locked !== "boolean") {
    throw new Error("Invalid learning video response shape.");
  }

  return data as LearningVideosApiResponse;
}

