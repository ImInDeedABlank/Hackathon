export type LearningVideoLanguage = "English" | "Arabic" | "Spanish";
export type UILanguageCode = "en" | "ar";
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type PlacementBand = "Beginner" | "Intermediate" | "Advanced";

export type PlacementSkillScoresInput = {
  vocab?: number;
  grammar?: number;
  reading?: number;
  writing?: number;
};

export type PlacementProfileInput = {
  level?: PlacementBand;
  cefrLevel?: CEFRLevel;
  cefr_hint?: CEFRLevel;
  numericScore?: number;
  confidence?: number;
  strengths?: string[];
  weaknesses?: string[];
  summary?: {
    skillScores?: PlacementSkillScoresInput;
  };
};

export type LearningVideosRequestBody = {
  userId?: string;
  uiLanguage?: UILanguageCode;
  selectedLanguage?: LearningVideoLanguage;
  targetLanguage?: LearningVideoLanguage;
  placement?: PlacementProfileInput;
};

export type NormalizedPlacementProfile = {
  userId: string;
  uiLanguage: UILanguageCode;
  selectedLanguage: LearningVideoLanguage;
  selectedLanguageCode: "en" | "ar" | "es";
  completed: boolean;
  level: PlacementBand;
  cefrLevel: CEFRLevel;
  numericScore: number;
  confidence: number;
  strengths: [string, string, string];
  weaknesses: [string, string, string];
};

export type TopicRecommendation = {
  topic: string;
  reason: string;
  difficulty: CEFRLevel;
  searchQueries: string[];
};

export type VideoRecommendationModel = {
  language: string;
  level: CEFRLevel;
  learnerProfileSummary: string;
  recommendedTopics: TopicRecommendation[];
  pacingAdvice: string;
  weeklyPlanHint: string;
};

export type LearningVideoItem = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  publishedAt?: string;
  videoUrl: string;
  topicTag?: string;
  levelTag?: string;
  rationale?: string;
};

export type LearningVideosApiSource = {
  cacheHit: boolean;
  usedGemini: boolean;
  usedYouTube: boolean;
  usedFallbackTopics: boolean;
  usedFallbackVideos: boolean;
};

export type LearningVideosApiResponse =
  | {
      locked: true;
      message: string;
      source: LearningVideosApiSource;
    }
  | {
      locked: false;
      profile: NormalizedPlacementProfile;
      learnerProfileSummary: string;
      recommendedTopics: TopicRecommendation[];
      pacingAdvice: string;
      weeklyPlanHint: string;
      weeklyPlan: string[];
      videos: LearningVideoItem[];
      source: LearningVideosApiSource;
    };
