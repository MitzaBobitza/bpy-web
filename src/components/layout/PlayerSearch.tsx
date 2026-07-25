"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Avatar } from "@/components/osu/Avatar";
import { searchPlayers } from "@/lib/bancho/client";
import type { SearchPlayer } from "@/lib/bancho/types";
import { cn } from "@/lib/cn";

/** bancho.py rejects anything shorter. */
const MIN_TERM = 2;

/**
 * Player search with live suggestions.
 *
 * Results are stored together with the term that produced them, so what is
 * shown is always derived from the current input — a stale list can never
 * appear under a newer query, and the effect never has to clear state.
 */
export function PlayerSearch({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<{ term: string; players: SearchPlayer[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = term.trim();
  const longEnough = query.length >= MIN_TERM;
  // only results belonging to the current query are shown
  const results = found?.term === query ? found.players : [];

  useEffect(() => {
    const pending = term.trim();
    if (pending.length < MIN_TERM) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const players = await searchPlayers(pending);
        if (!controller.signal.aborted) {
          setFound({ term: pending, players: players.slice(0, 8) });
          setOpen(true);
        }
      } catch {
        if (!controller.signal.aborted) setFound({ term: pending, players: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  // dismiss the suggestion list on an outside click
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!longEnough) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={submit} role="search">
        <label htmlFor={listId} className="sr-only">
          Search players
        </label>
        <input
          id={listId}
          type="search"
          value={term}
          autoComplete="off"
          placeholder="Search players"
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
          className="h-9 w-44 rounded-full border border-line bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-faint transition focus:w-56 focus:border-pink focus:outline-none"
        />
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.75" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </form>

      {open && longEnough ? (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-md border border-line bg-surface shadow-2xl shadow-black/50">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-faint">
              {loading ? "Searching…" : `No players match “${query}”.`}
            </p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={`/u/${result.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-surface-3"
                  >
                    <Avatar playerId={result.id} name={result.name} size={26} />
                    <span className="truncate-flex text-sm font-bold text-ink">{result.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
