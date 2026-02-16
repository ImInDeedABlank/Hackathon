import type { LearningVideosApiResponse, LearningVideosRequestBody } from "@/types/learningVideos";
import { apiFetch } from "@/src/lib/apiFetch";

export async function fetchLearningVideosRecommendations(
  payload: LearningVideosRequestBody,
  signal?: AbortSignal,
): Promise<LearningVideosApiResponse> {
  const response = await apiFetch<unknown>("/api/learning-videos", {
    method: "POST",
    body: payload,
    signal,
  });
  const data = response.data;

  if (!data || typeof data !== "object" || typeof (data as { locked?: unknown }).locked !== "boolean") {
    throw new Error("Invalid learning video response shape.");
  }

  return data as LearningVideosApiResponse;
}

