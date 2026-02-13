import LandingCards from "@/app/components/landing/LandingCards";
import LandingHero from "@/app/components/landing/LandingHero";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-blue-100 via-indigo-100 to-purple-100 px-5 py-10 sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />
      <div className="relative mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col items-center justify-center">
        <LandingHero />
        <LandingCards />
      </div>
    </main>
  );
}
