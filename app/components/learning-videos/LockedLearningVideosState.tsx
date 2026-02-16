import Link from "next/link";
import SectionHeader from "@/app/components/ui/SectionHeader";

type LockedLearningVideosStateProps = {
  isRtl?: boolean;
};

export default function LockedLearningVideosState({
  isRtl = false,
}: LockedLearningVideosStateProps) {
  return (
    <section className={`app-section ${isRtl ? "text-right" : "text-left"}`}>
      <SectionHeader
        as="h1"
        align={isRtl ? "right" : "left"}
        kicker="Locked"
        title="Learning videos unlock after placement."
        description="Complete adaptive placement to receive CEFR-based recommendations for your learning language."
      />
      <div className="mt-5">
        <Link
          href="/placement"
          className="btn-glow focus-ring px-4 py-2.5 text-sm"
        >
          Take Placement
        </Link>
      </div>
    </section>
  );
}
