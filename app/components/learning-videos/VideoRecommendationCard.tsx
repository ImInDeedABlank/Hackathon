import type { LearningVideoItem } from "@/types/learningVideos";

type VideoRecommendationCardProps = {
  video: LearningVideoItem;
};

function formatPublishedAt(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
}

export default function VideoRecommendationCard({ video }: VideoRecommendationCardProps) {
  const published = formatPublishedAt(video.publishedAt);
  return (
    <article className="theme-panel rounded-2xl p-3 sm:p-4">
      <div className="theme-panel-soft overflow-hidden rounded-xl">
        <div className="aspect-video w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      <div className="mt-3">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{video.title}</p>
        <p className="mt-1 text-xs text-slate-600">{video.channelTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {video.levelTag ? (
            <span className="theme-panel-soft rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-800">
              {video.levelTag}
            </span>
          ) : null}
          {video.topicTag ? (
            <span className="theme-panel-soft rounded-full px-2.5 py-1 text-[11px] text-slate-700">
              {video.topicTag}
            </span>
          ) : null}
          {published ? (
            <span className="theme-panel-soft rounded-full px-2.5 py-1 text-[11px] text-slate-700">{published}</span>
          ) : null}
        </div>
        {video.rationale ? (
          <p className="mt-2 line-clamp-3 text-xs text-slate-600">{video.rationale}</p>
        ) : null}
      </div>
      <div className="mt-3">
        <a
          href={video.videoUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Watch ${video.title} on YouTube`}
          className="btn-outline inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold"
        >
          Watch on YouTube
        </a>
      </div>
    </article>
  );
}
