import type { ReactNode } from "react";

type PageContainerProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageContainer({
  title,
  description,
  children,
}: PageContainerProps) {
  return (
    <main className="theme-page relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 overflow-hidden px-6 py-12">
      <div className="theme-orb-overlay pointer-events-none absolute inset-0" />
      <header className="relative space-y-2 motion-safe:animate-[fade-up_520ms_ease-out_both]">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </header>
      <section className="theme-panel relative rounded-xl p-6 backdrop-blur motion-safe:animate-[card-enter_520ms_ease-out_100ms_both]">
        {children}
      </section>
    </main>
  );
}
