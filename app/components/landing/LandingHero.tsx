"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import WebGLHeroScene from "@/app/components/landing/WebGLHeroScene";

export default function LandingHero() {
  const { lang, t } = useLanguage();
  const isRtl = lang === "ar";
  const quickStats = [
    { label: t("stat_adaptive_questions"), value: t("stat_adaptive_questions_value") },
    { label: t("stat_placement_steps"), value: t("stat_placement_steps_value") },
    { label: t("stat_live_feedback"), value: t("stat_live_feedback_value") },
  ];

  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-9 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
      <div className={`relative ${isRtl ? "text-right" : "text-left"}`}>
        <span className="app-chip app-interactive inline-flex items-center gap-2 motion-safe:animate-[fade-down_600ms_ease-out_both]">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 motion-safe:animate-[pulse_2s_ease-in-out_infinite]" />
          {t("app_title")}
        </span>
        <h1 className="app-title-xl mt-5 motion-safe:animate-[fade-up_750ms_ease-out_100ms_both]">
          {t("hero_title")}
        </h1>
        <p className="app-body app-muted mt-5 max-w-2xl motion-safe:animate-[fade-up_750ms_ease-out_220ms_both]">
          {t("hero_subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 motion-safe:animate-[fade-up_750ms_ease-out_340ms_both]">
          <Link
            href="/placement"
            className="btn-glow focus-ring px-6 py-3"
          >
            {t("start_test")}
          </Link>
          <Link
            href="/mode-select"
            className="btn-outline focus-ring px-6 py-3"
          >
            {t("view_learning_modes")}
          </Link>
          <Link
            href="/language"
            className="btn-outline focus-ring px-6 py-3"
          >
            {t("settings")}
          </Link>
        </div>
        <div className="app-stats-grid mt-8">
          {quickStats.map((item, index) => (
            <article
              key={item.label}
              className="app-stat-card app-interactive motion-lift motion-safe:animate-[fade-up_700ms_ease-out_both]"
              style={{ animationDelay: `${450 + index * 120}ms` }}
            >
              <p className="app-stat-label">{item.label}</p>
              <p className="app-stat-value">{item.value}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="motion-safe:animate-[fade-up_900ms_ease-out_200ms_both]">
        <WebGLHeroScene />
      </div>
    </section>
  );
}
