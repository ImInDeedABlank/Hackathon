"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import LearningVideosHeader from "@/app/components/learning-videos/LearningVideosHeader";
import LockedLearningVideosState from "@/app/components/learning-videos/LockedLearningVideosState";
import StudyPlanCard from "@/app/components/learning-videos/StudyPlanCard";
import VideoRecommendationCard from "@/app/components/learning-videos/VideoRecommendationCard";
import WhyRecommendedCard from "@/app/components/learning-videos/WhyRecommendedCard";
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
    <section className="theme-panel rounded-2xl p-5 sm:p-6" aria-live="polite" aria-busy="true">
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
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className={`relative mx-auto flex w-full max-w-5xl flex-col gap-5 ${isRtl ? "text-right" : "text-left"}`}>
        {loadState === "checking" || loadState === "loading" ? (
          <>
            <LoadingSkeleton />
            <LoadingSkeleton />
          </>
        ) : null}

        {loadState === "locked" ? <LockedLearningVideosState isRtl={isRtl} /> : null}

        {loadState === "error" ? (
          <section className="theme-panel rounded-2xl p-6 sm:p-7">
            <p className="text-sm text-slate-700">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadRecommendations()}
              className="btn-glow mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold"
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
            />

            <section className="theme-panel rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Filters</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Topic</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topicOptions.map((topic) => {
                      const active = selectedTopic === topic;
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          aria-pressed={active}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${active ? "btn-glow" : "btn-outline"}`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label htmlFor="learning-video-sort" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Sort
                  </label>
                  <select
                    id="learning-video-sort"
                    aria-label="Sort recommendation videos"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value === "newest" ? "newest" : "relevance")}
                    className="theme-panel-soft mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="learning-video-level-override" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Level override
                  </label>
                  <select
                    id="learning-video-level-override"
                    aria-label="Level override unavailable"
                    disabled
                    value={unlockedResult.profile.cefrLevel}
                    className="theme-panel-soft mt-2 w-full cursor-not-allowed rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-500 opacity-70"
                  >
                    <option value={unlockedResult.profile.cefrLevel}>
                      Placement level ({unlockedResult.profile.cefrLevel})
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <section className="theme-panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Recommended For Your Level
                </h2>
                <button
                  type="button"
                  onClick={() => void loadRecommendations()}
                  className="btn-outline rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  Refresh
                </button>
              </div>
              {displayedVideos.length === 0 ? (
                <div className="theme-panel-soft mt-4 rounded-xl p-4 text-sm text-slate-700">
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
              <section className="theme-panel rounded-2xl p-5 text-sm text-slate-700 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Placement Context</h2>
                <p className="mt-2">
                  Cycles completed: <span className="font-semibold text-slate-900">{placementMeta.summary.cyclesCompleted}</span>
                </p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
