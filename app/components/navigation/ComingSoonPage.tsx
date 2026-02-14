import Link from "next/link";

type ComingSoonPageProps = {
  title: string;
  description: string;
};

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute left-1/2 top-0 h-56 w-[40rem] -translate-x-1/2" />
      <section className="theme-panel relative mx-auto w-full max-w-2xl rounded-[2rem] p-7 text-center backdrop-blur motion-safe:animate-[fade-up_620ms_ease-out_both] sm:p-10">
        <p className="theme-kicker text-[11px] font-semibold uppercase tracking-[0.2em]">Coming Soon</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-4 text-sm text-slate-600 sm:text-base">{description}</p>
        <p className="mt-4 text-sm text-slate-600">
          This section is in progress and will be available in an upcoming update.
        </p>
        <Link
          href="/"
          className="btn-glow mt-8 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
        >
          Back Home
        </Link>
      </section>
    </main>
  );
}
