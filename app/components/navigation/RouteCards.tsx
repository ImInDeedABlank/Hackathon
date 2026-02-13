import Link from "next/link";

import type { AppRoute } from "@/app/lib/routes";

type RouteCardsProps = {
  routes: AppRoute[];
};

export default function RouteCards({ routes }: RouteCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className="rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-500"
        >
          <p className="text-base font-medium">{route.title}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {route.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
