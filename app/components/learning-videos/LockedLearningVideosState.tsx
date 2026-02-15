import Link from "next/link";

type LockedLearningVideosStateProps = {
  isRtl?: boolean;
};

export default function LockedLearningVideosState({
  isRtl = false,
}: LockedLearningVideosStateProps) {
  return (
    <section className={`theme-panel rounded-2xl p-6 sm:p-7 ${isRtl ? "text-right" : "text-left"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Locked</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Learning Videos unlock after placement.</h1>
      <p className="mt-2 text-sm text-slate-600">
        Complete adaptive placement to receive CEFR-based recommendations for your learning language.
      </p>
      <div className="mt-5">
        <Link
          href="/placement"
          className="btn-glow inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Take Placement
        </Link>
      </div>
    </section>
  );
}

