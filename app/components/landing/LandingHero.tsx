import Link from "next/link";

export default function LandingHero() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
      <span className="inline-flex rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm backdrop-blur">
        LinguaSim
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
        Learn Languages Through Real-Life Scenarios
      </h1>
      <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
        Practice real conversations, not random vocabulary.
      </p>
      <Link
        href="/quiz"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Start Test
      </Link>
    </section>
  );
}
