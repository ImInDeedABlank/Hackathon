const journeySteps = [
  {
    step: "01",
    title: "Discover your baseline",
    text: "Start with fast vocabulary and grammar checks so the system tunes difficulty instantly.",
  },
  {
    step: "02",
    title: "Write with intent",
    text: "Submit a short writing sample and get structured language feedback, not just a score.",
  },
  {
    step: "03",
    title: "Practice in context",
    text: "Move into scenarios that feel like real conversations with clear next-step recommendations.",
  },
];

const interactionHighlights = [
  {
    title: "Depth Layers",
    text: "Glass cards, radial backdrops, and moving light cues create a stronger visual hierarchy.",
  },
  {
    title: "Micro-Interactions",
    text: "Buttons, cards, and choices respond with lift, glow, and motion-safe transitions.",
  },
  {
    title: "Story Flow",
    text: "Users are guided from intro to placement to mode choice instead of dropped into a static form.",
  },
];

export default function LandingCards() {
  return (
    <section className="mx-auto mt-14 w-full max-w-6xl space-y-8">
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
