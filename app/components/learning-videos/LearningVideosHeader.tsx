import type { CEFRLevel, LearningVideoLanguage } from "@/types/learningVideos";
import SectionHeader from "@/app/components/ui/SectionHeader";

type LearningVideosHeaderProps = {
  language: LearningVideoLanguage;
  cefrLevel: CEFRLevel;
  confidence: number;
  isRtl?: boolean;
};

export default function LearningVideosHeader({
  language,
  cefrLevel,
  confidence,
  isRtl = false,
}: LearningVideosHeaderProps) {
  return (
    <header className="app-section">
      <SectionHeader
        as="h1"
        align={isRtl ? "right" : "left"}
        kicker="Personalized Recommendations"
        title="Learning Videos"
        description="Personalized by your selected language and adaptive placement level."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="app-chip">
          Language: {language}
        </span>
        <span className="app-chip">
          CEFR: {cefrLevel}
        </span>
        <span className="app-chip">
          Confidence: {confidence}%
        </span>
      </div>
    </header>
  );
}
