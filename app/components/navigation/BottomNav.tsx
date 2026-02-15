"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SideNavItem = {
  href: string;
  label: string;
  icon: "quiz" | "videos";
};

const SIDE_ITEMS: SideNavItem[] = [
  { href: "/vocab-quiz", label: "Vocab Quiz", icon: "quiz" },
  { href: "/learning-videos", label: "Learning Videos", icon: "videos" },
];

function SideLink({ href, label, icon, active }: SideNavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`app-bottom-nav-link ${active ? "app-bottom-nav-link-active" : ""}`}
    >
      <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-slate-700">
        {icon === "quiz" ? (
          <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
            <rect x="3.5" y="2.8" width="10.5" height="14.4" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 7h4M7 10h4M7 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 5.5h2.5v11.7H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
            <rect x="2.8" y="4.4" width="14.4" height="11.2" rx="2.2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 8l4 2-4 2V8z" fill="currentColor" />
          </svg>
        )}
      </span>
      <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-900 sm:text-xs">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary app navigation"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative w-full max-w-md">
        <div className="app-bottom-nav-shell flex items-center justify-between gap-3 rounded-[1.75rem] px-4 py-3 sm:px-5">
          <SideLink {...SIDE_ITEMS[0]} active={pathname === SIDE_ITEMS[0].href} />
          <div className="h-12 w-[4.5rem] shrink-0" aria-hidden="true" />
          <SideLink {...SIDE_ITEMS[1]} active={pathname === SIDE_ITEMS[1].href} />
        </div>

        <Link
          href="/main"
          aria-label="Home"
          aria-current={pathname === "/main" ? "page" : undefined}
          className={`app-bottom-nav-home absolute left-1/2 -top-8 z-10 flex h-[4.2rem] w-[4.2rem] -translate-x-1/2 flex-col items-center justify-center rounded-full ${pathname === "/main" ? "app-bottom-nav-home-active" : ""}`}
        >
          <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-white">
            <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
              <path d="M3.5 9.2L10 4l6.5 5.2v6.1a1.5 1.5 0 01-1.5 1.5h-3.2v-4h-3.6v4H5a1.5 1.5 0 01-1.5-1.5V9.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Home</span>
        </Link>
      </div>
    </nav>
  );
}
