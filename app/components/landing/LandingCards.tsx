"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function LandingCards() {
  const { lang, t } = useLanguage();
  const isRtl = lang === "ar";
  const journeySteps = [
    {
      step: "01",
      title: t("journey_1_title"),
      text: t("journey_1_text"),
    },
    {
      step: "02",
      title: t("journey_2_title"),
      text: t("journey_2_text"),
    },
    {
      step: "03",
      title: t("journey_3_title"),
      text: t("journey_3_text"),
    },
  ];

  const interactionHighlights = [
    {
      title: t("highlight_depth_layers_title"),
      text: t("highlight_depth_layers_text"),
    },
    {
      title: t("highlight_micro_title"),
      text: t("highlight_micro_text"),
    },
    {
      title: t("highlight_story_title"),
      text: t("highlight_story_text"),
    },
  ];

  return (
    <section className={`mx-auto mt-14 w-full max-w-6xl space-y-8 ${isRtl ? "text-right" : "text-left"}`}>
      <div className="grid gap-4 lg:grid-cols-3">
        {journeySteps.map((item, index) => (
          <article
            key={item.title}
            className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-md motion-safe:animate-[fade-up_700ms_ease-out_both]"
            style={{ animationDelay: `${index * 140}ms` }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-200/40 blur-2xl transition group-hover:bg-cyan-200/60" />
            <p className="text-xs font-semibold tracking-[0.16em] text-cyan-700">{item.step}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {interactionHighlights.map((item, index) => (
          <article
            key={item.title}
            className="rounded-xl border border-slate-200/80 bg-slate-50/75 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-sm motion-safe:animate-[fade-up_700ms_ease-out_both]"
            style={{ animationDelay: `${280 + index * 120}ms` }}
          >
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
