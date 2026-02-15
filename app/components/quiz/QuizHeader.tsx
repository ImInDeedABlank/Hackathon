"use client";

import { useLanguage } from "@/components/LanguageProvider";

type QuizHeaderProps = {
  title: string;
  subtitle?: string;
  packLabel?: string;
  onBack: () => void;
};

export default function QuizHeader({ title, subtitle, packLabel = "English Pack", onBack }: QuizHeaderProps) {
  const { lang } = useLanguage();
  const isRtl = lang === "ar";

  return (
    <header className={`theme-panel rounded-2xl p-5 backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-6 ${isRtl ? "text-right" : "text-left"}`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-outline inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <p className="theme-kicker text-[11px] font-semibold uppercase tracking-[0.18em]">{packLabel}</p>
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}
    </header>
  );
}
