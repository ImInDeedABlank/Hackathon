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

  return (
    <section className={`mx-auto mt-14 w-full max-w-6xl space-y-8 ${isRtl ? "text-right" : "text-left"}`}>
      <div className="grid gap-4 lg:grid-cols-3">
        {journeySteps.map((item, index) => (
          <article
            key={item.title}
            className="app-section app-surface-lift app-interactive motion-lift group relative overflow-hidden motion-safe:animate-[fade-up_700ms_ease-out_both]"
            style={{ animationDelay: `${index * 140}ms` }}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-200/40 blur-2xl transition group-hover:bg-cyan-200/60" />
            <p className="app-kicker">{item.step}</p>
            <h2 className="app-title-md mt-2">{item.title}</h2>
            <p className="app-body app-muted mt-3 text-sm">{item.text}</p>
          </article>
        ))}
      </div>

    </section>
  );
}
