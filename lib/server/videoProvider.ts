import "server-only";

import type { CEFRLevel, LearningVideoItem, TopicRecommendation } from "@/types/learningVideos";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_WEB_SEARCH_URL = "https://www.youtube.com/results";
const YOUTUBE_OEMBED_URL = "https://www.youtube.com/oembed";
const FALLBACK_THUMBNAIL = "/next.svg";

export type VideoQueryIntent = {
  query: string;
  topicTag: string;
  levelTag: CEFRLevel;
  rationale: string;
};

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
};

type YouTubeOEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

function uniqueIntents(intents: VideoQueryIntent[], limit: number): VideoQueryIntent[] {
  const seen = new Set<string>();
  const output: VideoQueryIntent[] = [];
  for (const intent of intents) {
    const trimmed = intent.query.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...intent, query: trimmed });
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

function safeText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.slice(0, max);
}

function uniqueVideos(items: LearningVideoItem[], limit = 16): LearningVideoItem[] {
  const unique = new Map<string, LearningVideoItem>();
  for (const item of items) {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
    if (unique.size >= limit) {
      break;
    }
  }
  return Array.from(unique.values());
}

function parseVideoIdsFromWebHtml(html: string, limit: number): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  const addId = (value: string) => {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    ids.push(value);
  };

  const directRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let match: RegExpExecArray | null = directRegex.exec(html);
  while (match) {
    addId(match[1]);
    if (ids.length >= limit) {
      return ids;
    }
    match = directRegex.exec(html);
  }

  const escapedRegex = /videoId\\":\\"([a-zA-Z0-9_-]{11})\\"/g;
  match = escapedRegex.exec(html);
  while (match) {
    addId(match[1]);
    if (ids.length >= limit) {
      return ids;
    }
    match = escapedRegex.exec(html);
  }

  return ids.slice(0, limit);
}

async function fetchVideoIdsFromWebSearch(
  query: string,
  relevanceLanguage: "en" | "ar" | "es",
  limit: number,
): Promise<string[]> {
  const url = new URL(YOUTUBE_WEB_SEARCH_URL);
  url.searchParams.set("search_query", query);
  url.searchParams.set("hl", relevanceLanguage);
  url.searchParams.set("persist_hl", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "text/html",
      "Accept-Language": `${relevanceLanguage},en;q=0.8`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`YouTube web search HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseVideoIdsFromWebHtml(html, limit);
}

async function fetchOEmbedForVideoId(videoId: string): Promise<{
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
} | null> {
  const url = new URL(YOUTUBE_OEMBED_URL);
  url.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as YouTubeOEmbedResponse;
  const title = safeText(data.title, "Untitled lesson", 180);
  const channelTitle = safeText(data.author_name, "Unknown channel", 120);
  const thumbnailUrl =
    typeof data.thumbnail_url === "string" && data.thumbnail_url.trim().length > 0
      ? data.thumbnail_url
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return { title, channelTitle, thumbnailUrl };
}

async function fetchByQueryViaWebSearch(
  queryIntent: VideoQueryIntent,
  relevanceLanguage: "en" | "ar" | "es",
  maxResultsPerQuery: number,
): Promise<LearningVideoItem[]> {
  const videoIds = await fetchVideoIdsFromWebSearch(
    queryIntent.query,
    relevanceLanguage,
    maxResultsPerQuery,
  );
  if (videoIds.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(
    videoIds.map((videoId) => fetchOEmbedForVideoId(videoId)),
  );

  const items: LearningVideoItem[] = [];
  for (let index = 0; index < settled.length; index += 1) {
    const result = settled[index];
    const videoId = videoIds[index];
    if (result.status !== "fulfilled" || !result.value) {
      continue;
    }
    items.push({
      id: videoId,
      title: result.value.title,
      channelTitle: result.value.channelTitle,
      thumbnailUrl: result.value.thumbnailUrl,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      topicTag: queryIntent.topicTag,
      levelTag: queryIntent.levelTag,
      rationale: queryIntent.rationale,
    });
  }
  return items;
}

async function fetchFallbackVideosFromWebSearch({
  intents,
  relevanceLanguage,
}: {
  intents: VideoQueryIntent[];
  relevanceLanguage: "en" | "ar" | "es";
}): Promise<LearningVideoItem[]> {
  const settled = await Promise.allSettled(
    intents.map((intent) =>
      fetchByQueryViaWebSearch(intent, relevanceLanguage, 2),
    ),
  );
  const flattened: LearningVideoItem[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      flattened.push(...result.value);
    }
  }
  return uniqueVideos(flattened, 16);
}

async function fetchByQuery(
  apiKey: string,
  queryIntent: VideoQueryIntent,
  relevanceLanguage: "en" | "ar" | "es",
  maxResultsPerQuery: number,
): Promise<LearningVideoItem[]> {
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResultsPerQuery));
  url.searchParams.set("order", "relevance");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("relevanceLanguage", relevanceLanguage);
  url.searchParams.set("q", queryIntent.query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const raw = await response.text();
    const snippet = raw.slice(0, 300);
    throw new Error(`YouTube API HTTP ${response.status}. ${snippet}`);
  }

  const data = (await response.json()) as YouTubeSearchResponse;
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .map((item) => {
      const videoId = item.id?.videoId;
      if (!videoId) {
        return null;
      }
      const snippet = item.snippet ?? {};
      const thumbnailUrl =
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.default?.url ??
        FALLBACK_THUMBNAIL;

      return {
        id: videoId,
        title: safeText(snippet.title, "Untitled lesson", 180),
        channelTitle: safeText(snippet.channelTitle, "Unknown channel", 120),
        thumbnailUrl,
        publishedAt: typeof snippet.publishedAt === "string" ? snippet.publishedAt : undefined,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        topicTag: queryIntent.topicTag,
        levelTag: queryIntent.levelTag,
        rationale: queryIntent.rationale,
      } as LearningVideoItem;
    })
    .filter((item): item is LearningVideoItem => item !== null);
}

export function buildQueryIntents(topics: TopicRecommendation[], level: CEFRLevel): VideoQueryIntent[] {
  const intents: VideoQueryIntent[] = [];
  for (const topic of topics) {
    for (const query of topic.searchQueries.slice(0, 2)) {
      intents.push({
        query,
        topicTag: topic.topic,
        levelTag: topic.difficulty || level,
        rationale: topic.reason,
      });
    }
  }
  return uniqueIntents(intents, 8);
}

export async function fetchRecommendedVideos({
  intents,
  relevanceLanguage,
}: {
  intents: VideoQueryIntent[];
  relevanceLanguage: "en" | "ar" | "es";
}): Promise<{
  videos: LearningVideoItem[];
  usedYouTube: boolean;
  usedFallbackVideos: boolean;
  error?: string;
}> {
  const normalizedIntents = uniqueIntents(intents, 8);
  if (normalizedIntents.length === 0) {
    return {
      videos: [],
      usedYouTube: false,
      usedFallbackVideos: false,
      error: "No recommendation queries provided.",
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    const fallbackVideos = await fetchFallbackVideosFromWebSearch({
      intents: normalizedIntents,
      relevanceLanguage,
    });
    return {
      videos: fallbackVideos,
      usedYouTube: true,
      usedFallbackVideos: true,
      error:
        fallbackVideos.length === 0
          ? "Could not retrieve YouTube videos without API access."
          : "Using keyless YouTube fallback mode.",
    };
  }

  try {
    const settled = await Promise.allSettled(
      normalizedIntents.map((intent) =>
        fetchByQuery(apiKey, intent, relevanceLanguage, 2),
      ),
    );

    const videos = uniqueVideos(
      settled
        .filter((result): result is PromiseFulfilledResult<LearningVideoItem[]> => result.status === "fulfilled")
        .flatMap((result) => result.value),
      16,
    );
    if (videos.length === 0) {
      const fallbackVideos = await fetchFallbackVideosFromWebSearch({
        intents: normalizedIntents,
        relevanceLanguage,
      });
      return {
        videos: fallbackVideos,
        usedYouTube: true,
        usedFallbackVideos: true,
        error:
          fallbackVideos.length === 0
            ? "YouTube returned no video matches."
            : "YouTube API returned no videos; used web fallback.",
      };
    }

    return {
      videos,
      usedYouTube: true,
      usedFallbackVideos: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown video provider error.";
    console.error(`[api/learning-videos] video provider failure message="${message}"`);
    const fallbackVideos = await fetchFallbackVideosFromWebSearch({
      intents: normalizedIntents,
      relevanceLanguage,
    });
    return {
      videos: fallbackVideos,
      usedYouTube: true,
      usedFallbackVideos: true,
      error:
        fallbackVideos.length === 0
          ? message
          : `${message} (used web fallback videos)`,
    };
  }
}
