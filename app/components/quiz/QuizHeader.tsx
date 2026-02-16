"use client";

import { useLanguage } from "@/components/LanguageProvider";
import SectionHeader from "@/app/components/ui/SectionHeader";

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
    <header className={`app-section motion-safe:animate-[fade-up_620ms_ease-out_both] ${isRtl ? "text-right" : "text-left"}`}>
      <SectionHeader
        as="h1"
        kicker={packLabel}
        title={title}
        description={subtitle}
        align={isRtl ? "right" : "left"}
        actions={
          <button
            type="button"
            onClick={onBack}
            className="btn-outline focus-ring px-3 py-2 text-xs uppercase tracking-[0.12em]"
            aria-label="Go back"
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
        }
      />
    </header>
  );
}
