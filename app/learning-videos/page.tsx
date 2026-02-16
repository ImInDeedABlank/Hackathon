"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import LearningVideosHeader from "@/app/components/learning-videos/LearningVideosHeader";
import LockedLearningVideosState from "@/app/components/learning-videos/LockedLearningVideosState";
import StudyPlanCard from "@/app/components/learning-videos/StudyPlanCard";
import VideoRecommendationCard from "@/app/components/learning-videos/VideoRecommendationCard";
import WhyRecommendedCard from "@/app/components/learning-videos/WhyRecommendedCard";
import SectionHeader from "@/app/components/ui/SectionHeader";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchLearningVideosRecommendations } from "@/lib/learningVideosClient";
import {
  STORAGE_KEYS,
  readPlacementMeta,
  readPlacementResult,
  readString,
  type PlacementMeta,
} from "@/lib/placementStorage";
import type { PlacementResult } from "@/lib/placement";
import type {
  LearningVideoLanguage,
  LearningVideosApiResponse,
  LearningVideosRequestBody,
} from "@/types/learningVideos";

type LoadState = "checking" | "locked" | "loading" | "ready" | "error";
type SortMode = "relevance" | "newest";

function toLearningLanguage(value: string): LearningVideoLanguage {
  if (value === "Arabic" || value === "Spanish") {
    return value;
  }
  return "English";
}

function LoadingSkeleton() {
  return (
    <section className="app-section" aria-live="polite" aria-busy="true">
      <div className="h-5 w-40 animate-pulse rounded bg-slate-200/70" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-200/70" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200/70" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-200/70" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-200/70" />
      </div>
    </section>
  );
}

export default function LearningVideosPage() {
  const { lang } = useLanguage();
  const isRtl = lang === "ar";
  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [result, setResult] = useState<LearningVideosApiResponse | null>(null);
  const [placementResult, setPlacementResult] = useState<PlacementResult | null>(null);
  const [placementMeta, setPlacementMeta] = useState<PlacementMeta | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("All topics");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const requestRef = useRef<AbortController | null>(null);

  const loadRecommendations = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    const placement = readPlacementResult();
    const meta = readPlacementMeta();
    setPlacementResult(placement);
    setPlacementMeta(meta);

    if (!placement) {
      setResult(null);
      setLoadState("locked");
      return;
    }

    setLoadState("loading");
    setErrorMessage("");
    try {
      const selectedLanguage = toLearningLanguage(
        readString(STORAGE_KEYS.targetLanguage, "English"),
      );
      const payload: LearningVideosRequestBody = {
        uiLanguage: readString(STORAGE_KEYS.uiLanguage, lang === "ar" ? "ar" : "en") === "ar" ? "ar" : "en",
        selectedLanguage,
        placement: {
          level: placement.level,
          cefr_hint: placement.cefr_hint,
          confidence: placement.confidence,
          strengths: [...placement.strengths],
          weaknesses: [...placement.weaknesses],
          summary: meta ? { skillScores: { ...meta.summary.skillScores } } : undefined,
        },
      };

      const nextResult = await fetchLearningVideosRecommendations(payload, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (nextResult.locked) {
        setResult(nextResult);
        setLoadState("locked");
        return;
      }

      setResult(nextResult);
      setSelectedTopic("All topics");
      setSortMode("relevance");
      setLoadState("ready");
    } catch {
      if (controller.signal.aborted) {
        return;
      }
      setErrorMessage("Could not load recommendations right now. Please retry.");
      setLoadState("error");
    }
  }, [lang]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecommendations();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [loadRecommendations]);

  const unlockedResult = result && !result.locked ? result : null;

  const topicOptions = useMemo(() => {
    if (!unlockedResult) {
      return ["All topics"];
    }
    const topics = unlockedResult.recommendedTopics.map((item) => item.topic);
    const unique = Array.from(new Set(topics));
    return ["All topics", ...unique];
  }, [unlockedResult]);

  const displayedVideos = useMemo(() => {
    if (!unlockedResult) {
      return [];
    }
    let videos = [...unlockedResult.videos];
    if (selectedTopic !== "All topics") {
      videos = videos.filter((video) => video.topicTag === selectedTopic);
    }
    if (sortMode === "newest") {
      videos.sort((a, b) => {
        const first = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const second = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return second - first;
      });
    }
    return videos;
  }, [unlockedResult, selectedTopic, sortMode]);

  return (
    <main className="app-page theme-page">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className={`app-shell app-shell-lg ${isRtl ? "text-right" : "text-left"}`}>
        {loadState === "checking" || loadState === "loading" ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : null}

        {loadState === "locked" ? <LockedLearningVideosState isRtl={isRtl} /> : null}

        {loadState === "error" ? (
          <section className="app-section sm:p-7">
            <p className="app-body app-muted text-sm">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadRecommendations()}
              className="btn-glow focus-ring mt-4 px-4 py-2.5 text-sm"
            >
              Retry
            </button>
          </section>
        ) : null}

        {loadState === "ready" && unlockedResult ? (
          <>
            <LearningVideosHeader
              language={unlockedResult.profile.selectedLanguage}
              cefrLevel={unlockedResult.profile.cefrLevel}
              confidence={unlockedResult.profile.confidence}
              isRtl={isRtl}
            />

            <section className="app-section">
              <SectionHeader
                as="h2"
                align={isRtl ? "right" : "left"}
                kicker="Explore"
                title="Filters"
                description="Adjust topic and ordering to refine your recommendations."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="app-caption text-xs font-semibold uppercase tracking-[0.12em]">Topic</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topicOptions.map((topic) => {
                      const active = selectedTopic === topic;
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          aria-pressed={active}
                          className={`app-chip app-interactive focus-ring ${active ? "app-chip-active" : ""}`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="learning-video-sort" className="app-caption text-xs font-semibold uppercase tracking-[0.12em]">
                    Sort
                  </label>
                  <select
                    id="learning-video-sort"
                    aria-label="Sort recommendation videos"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value === "newest" ? "newest" : "relevance")}
                    className="app-select mt-2"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="learning-video-level-override" className="app-caption text-xs font-semibold uppercase tracking-[0.12em]">
                    Level override
                  </label>
                  <select
                    id="learning-video-level-override"
                    aria-label="Level override unavailable"
                    disabled
                    value={unlockedResult.profile.cefrLevel}
                    className="app-select mt-2 cursor-not-allowed opacity-70"
                  >
                    <option value={unlockedResult.profile.cefrLevel}>
                      Placement level ({unlockedResult.profile.cefrLevel})
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <section className="app-section">
              <SectionHeader
                as="h2"
                align={isRtl ? "right" : "left"}
                kicker="Recommendations"
                title="Recommended for your level"
                description="Video picks tuned to your CEFR profile and recent placement signals."
                actions={
                  <button
                    type="button"
                    onClick={() => void loadRecommendations()}
                    className="btn-outline focus-ring px-3 py-1.5 text-xs"
                  >
                    Refresh
                  </button>
                }
              />
              {displayedVideos.length === 0 ? (
                <div className="app-section-soft app-body app-muted mt-4 text-sm">
                  No videos found yet for this filter. Try reset filters or retry.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedVideos.map((video) => (
                    <VideoRecommendationCard key={video.id} video={video} />
                  ))}
                </div>
              )}
            </section>

            <WhyRecommendedCard
              summary={unlockedResult.learnerProfileSummary}
              pacingAdvice={unlockedResult.pacingAdvice}
              strengths={placementResult?.strengths ?? unlockedResult.profile.strengths}
              weaknesses={placementResult?.weaknesses ?? unlockedResult.profile.weaknesses}
            />

            <StudyPlanCard
              weeklyPlanHint={unlockedResult.weeklyPlanHint}
              steps={unlockedResult.weeklyPlan}
            />

            {placementMeta ? (
              <section className="app-section text-sm">
                <h2 className="app-kicker">Placement Context</h2>
                <p className="app-body app-muted mt-2">
                  Cycles completed: <span className="font-semibold text-[color:var(--text-strong)]">{placementMeta.summary.cyclesCompleted}</span>
                </p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
