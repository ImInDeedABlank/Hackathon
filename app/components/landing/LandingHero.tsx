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
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className={`relative ${isRtl ? "text-right" : "text-left"}`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-800 shadow-sm backdrop-blur motion-safe:animate-[fade-down_600ms_ease-out_both]">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 motion-safe:animate-[pulse_2s_ease-in-out_infinite]" />
          {t("app_title")}
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl motion-safe:animate-[fade-up_750ms_ease-out_100ms_both]">
          {t("hero_title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg motion-safe:animate-[fade-up_750ms_ease-out_220ms_both]">
          {t("hero_subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3 motion-safe:animate-[fade-up_750ms_ease-out_340ms_both]">
          <Link
            href="/placement"
            className="btn-glow inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {t("start_test")}
          </Link>
          <Link
            href="/mode-select"
            className="btn-outline inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            {t("view_learning_modes")}
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {quickStats.map((item, index) => (
            <article
              key={item.label}
              className="rounded-xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-md motion-safe:animate-[fade-up_700ms_ease-out_both]"
              style={{ animationDelay: `${450 + index * 120}ms` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
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
