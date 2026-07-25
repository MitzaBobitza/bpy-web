import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Tab strip with the pink underline osu! uses for the active item. Rendered
 * as links so each tab is a real, shareable URL.
 */
export function TabLinks({
  tabs,
  className,
}: {
  tabs: { href: string; label: string; active: boolean; count?: number }[];
  className?: string;
}) {
  return (
    <nav className={cn("flex gap-1 overflow-x-auto", className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "relative flex-none whitespace-nowrap px-3 py-2.5 text-sm font-bold transition",
            "after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:transition",
            tab.active
              ? "text-ink after:bg-pink"
              : "text-faint hover:text-dim after:bg-transparent hover:after:bg-line-bright",
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1.5 text-xs font-bold text-faint">{tab.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** Small pill-style segmented control, also link-driven. */
export function PillLinks({
  items,
  className,
}: {
  items: { href: string; label: string; active: boolean; title?: string }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-md bg-void p-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.title}
          aria-current={item.active ? "true" : undefined}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-bold transition",
            item.active ? "bg-pink text-void" : "text-faint hover:bg-surface-2 hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Page-through control for paginated listings. Renders a window of pages
 * around the current one plus first/last jumps.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const window = 2;
  const pages: (number | "gap")[] = [];
  for (let candidate = 1; candidate <= totalPages; candidate += 1) {
    const nearCurrent = Math.abs(candidate - page) <= window;
    const isEdge = candidate === 1 || candidate === totalPages;
    if (nearCurrent || isEdge) {
      pages.push(candidate);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-4" aria-label="Pagination">
      <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Previous page">
        ‹
      </PageLink>
      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1.5 text-faint">
            …
          </span>
        ) : (
          <PageLink
            key={entry}
            href={buildHref(entry)}
            active={entry === page}
            label={`Page ${entry}`}
          >
            {entry}
          </PageLink>
        ),
      )}
      <PageLink href={buildHref(page + 1)} disabled={page >= totalPages} label="Next page">
        ›
      </PageLink>
    </nav>
  );
}

/**
 * Previous/next pager for listings whose total size is unknown.
 *
 * Some bancho.py endpoints (the leaderboards in particular) report the
 * page and page size but not a total count, so there is no last page to
 * link to — "next" is offered whenever the current page came back full.
 */
export function SimplePager({
  page,
  hasNext,
  buildHref,
}: {
  page: number;
  hasNext: boolean;
  buildHref: (page: number) => string;
}) {
  if (page === 1 && !hasNext) return null;

  return (
    <nav className="flex items-center justify-center gap-2 py-4" aria-label="Pagination">
      <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Previous page">
        ‹ Previous
      </PageLink>
      <span className="px-2 text-sm font-bold text-faint">Page {page}</span>
      <PageLink href={buildHref(page + 1)} disabled={!hasNext} label="Next page">
        Next ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active = false,
  disabled = false,
  label,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const classes = cn(
    "grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-bold transition",
    active
      ? "bg-pink text-void"
      : disabled
        ? "cursor-not-allowed text-line-bright"
        : "bg-surface text-dim hover:bg-surface-3 hover:text-ink",
  );

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
