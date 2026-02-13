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
          className="rounded-xl border border-slate-200 bg-white/90 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-sm"
        >
          <p className="text-base font-medium text-slate-900">{route.title}</p>
          <p className="text-sm text-slate-600">
            {route.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
