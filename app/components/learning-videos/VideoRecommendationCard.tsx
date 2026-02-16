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
    <article className="app-section app-interactive motion-lift p-3 sm:p-4">
      <div className="app-section-soft overflow-hidden rounded-xl p-0">
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
        <p className="line-clamp-2 text-sm font-semibold text-[color:var(--text-strong)]">{video.title}</p>
        <p className="app-muted mt-1 text-xs">{video.channelTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {video.levelTag ? (
            <span className="app-chip">
              {video.levelTag}
            </span>
          ) : null}
          {video.topicTag ? (
            <span className="app-chip">
              {video.topicTag}
            </span>
          ) : null}
          {published ? (
            <span className="app-chip">{published}</span>
          ) : null}
        </div>
        {video.rationale ? (
          <p className="app-muted mt-2 line-clamp-3 text-xs">{video.rationale}</p>
        ) : null}
      </div>
      <div className="mt-3">
        <a
          href={video.videoUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Watch ${video.title} on YouTube`}
          className="btn-outline focus-ring px-3 py-2 text-xs"
        >
          Watch on YouTube
        </a>
      </div>
    </article>
  );
}
