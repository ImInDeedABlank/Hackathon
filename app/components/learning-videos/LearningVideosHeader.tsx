import type { CEFRLevel, LearningVideoLanguage } from "@/types/learningVideos";

type LearningVideosHeaderProps = {
  language: LearningVideoLanguage;
  cefrLevel: CEFRLevel;
  confidence: number;
};

export default function LearningVideosHeader({
  language,
  cefrLevel,
  confidence,
}: LearningVideosHeaderProps) {
  return (
    <header className="theme-panel rounded-2xl p-5 backdrop-blur sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Personalized Recommendations</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Learning Videos</h1>
      <p className="mt-1 text-sm text-slate-600">
        Personalized by your selected language and adaptive placement level.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="theme-panel-soft rounded-full px-3 py-1 text-xs font-semibold text-slate-900">
          Language: {language}
        </span>
        <span className="theme-panel-soft rounded-full px-3 py-1 text-xs font-semibold text-slate-900">
          CEFR: {cefrLevel}
        </span>
        <span className="theme-panel-soft rounded-full px-3 py-1 text-xs font-semibold text-slate-900">
          Confidence: {confidence}%
        </span>
      </div>
    </header>
  );
}

