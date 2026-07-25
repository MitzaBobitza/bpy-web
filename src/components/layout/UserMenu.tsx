"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Avatar } from "@/components/osu/Avatar";
import { RoleBadgeRow } from "@/components/osu/badges";
import { logout } from "@/lib/bancho/client";
import type { Player } from "@/lib/bancho/types";

const MENU_LINKS = [
  { href: (id: number) => `/u/${id}`, label: "My profile" },
  { href: () => "/friends", label: "Friends" },
  { href: () => "/favourites", label: "Favourite beatmaps" },
  { href: () => "/settings", label: "Settings" },
];

export function UserMenu({ player }: { player: Player }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function signOut() {
    try {
      await logout();
    } finally {
      setOpen(false);
      // refresh so every server component re-renders as a signed-out visitor
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        // the name is hidden below the sm breakpoint, so it is stated here
        // to keep the control named at every size
        aria-label={`Account menu for ${player.name}`}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-surface-2"
      >
        <Avatar playerId={player.id} name={player.name} size={30} rounded="full" />
        <span className="hidden max-w-24 truncate text-sm font-bold text-ink sm:block">
          {player.name}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-md border border-line bg-surface shadow-2xl shadow-black/50"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate font-bold text-ink">{player.name}</p>
            <RoleBadgeRow priv={player.priv} className="mt-1" />
          </div>
          <nav className="py-1">
            {MENU_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href(player.id)}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-dim transition hover:bg-surface-3 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line p-1">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={pending}
              className="w-full rounded px-3 py-2 text-left text-sm font-semibold text-coral transition hover:bg-coral/10 disabled:opacity-60"
            >
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
