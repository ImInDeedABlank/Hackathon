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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
      </header>
      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        {children}
      </section>
    </main>
  );
}
