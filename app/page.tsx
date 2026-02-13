import LandingCards from "@/app/components/landing/LandingCards";
import LandingHero from "@/app/components/landing/LandingHero";

export default function LandingPage() {
  return (
    <main className="theme-page relative min-h-screen overflow-hidden px-5 py-10 sm:px-8 sm:py-14">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <div className="theme-top-fade pointer-events-none absolute inset-x-0 top-0 h-72" />
      <div className="theme-orb-a pointer-events-none absolute left-[-5rem] top-24 h-44 w-44 rounded-full blur-3xl motion-safe:animate-[float_16s_ease-in-out_infinite]" />
      <div className="theme-orb-b pointer-events-none absolute right-[-6rem] top-56 h-56 w-56 rounded-full blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite_reverse]" />
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="radial-grid h-full w-full" />
      </div>
      <div className="relative mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col items-center justify-center">
        <LandingHero />
        <LandingCards />
      </div>
    </main>
  );
}
