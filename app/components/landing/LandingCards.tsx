const highlights = [
  {
    title: "Scenario-Based Practice",
    text: "Train for travel, work, and day-to-day conversations with context.",
  },
  {
    title: "Instant Feedback",
    text: "Get quick guidance on phrasing and clarity as you practice.",
  },
  {
    title: "Confidence Building",
    text: "Progress from guided prompts to natural conversation flow.",
  },
];

export default function LandingCards() {
  return (
    <section className="mx-auto mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {highlights.map((item) => (
        <article
          key={item.title}
          className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur"
        >
          <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
        </article>
      ))}
    </section>
  );
}
