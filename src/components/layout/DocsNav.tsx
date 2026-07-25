"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const DOC_PAGES = [
  { href: "/docs/connect", label: "How to connect" },
  { href: "/docs/rules", label: "Rules" },
  { href: "/docs/faq", label: "FAQ" },
  { href: "/docs/terms", label: "Terms of service" },
  { href: "/docs/privacy", label: "Privacy policy" },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation">
      <p className="eyebrow">Help</p>
      <ul className="mt-3 space-y-0.5">
        {DOC_PAGES.map((page) => {
          const active = pathname === page.href;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-semibold transition",
                  active ? "bg-pink/10 text-pink" : "text-dim hover:bg-surface-2 hover:text-ink",
                )}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
