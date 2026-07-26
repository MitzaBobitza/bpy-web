"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Avatar } from "@/components/osu/Avatar";
import { RoleBadgeRow } from "@/components/osu/badges";
import { logout } from "@/lib/bancho/client";
import type { Player } from "@/lib/bancho/types";
import { hasStaffAccess } from "@/lib/osu/privileges";

const MENU_LINKS = [
  { href: (id: number) => `/u/${id}`, label: "My profile" },
  { href: () => "/friends", label: "Friends" },
  { href: () => "/favourites", label: "Favourite beatmaps" },
  { href: () => "/settings", label: "Settings" },
];

/** Members go straight to their clan; everyone else to the listing. */
function clanHref(player: Player): string {
  return player.clan_id ? `/clans/${player.clan_id}` : "/clans";
}

export function UserMenu({
  player,
  clanInvites = 0,
}: {
  player: Player;
  /**
   * Pending clan invites.
   *
   * Being invited is the one thing that happens to a player without them
   * doing anything, so it has to announce itself — nobody goes looking for
   * an invite they have no reason to believe exists.
   */
  clanInvites?: number;
}) {
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
        aria-label={
          clanInvites > 0
            ? `Account menu for ${player.name}, ${clanInvites} clan ${
                clanInvites === 1 ? "invite" : "invites"
              } waiting`
            : `Account menu for ${player.name}`
        }
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-surface-2"
      >
        <span className="relative flex">
          <Avatar playerId={player.id} name={player.name} size={30} rounded="full" />
          {clanInvites > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink ring-2 ring-void"
            />
          ) : null}
        </span>
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
            {hasStaffAccess(player.priv) ? (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-bold text-violet transition hover:bg-surface-3"
              >
                Staff area
              </Link>
            ) : null}
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
            <Link
              href={clanHref(player)}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm font-semibold text-dim transition hover:bg-surface-3 hover:text-ink"
            >
              {player.clan_id ? "My clan" : "Clans"}
            </Link>
            {clanInvites > 0 ? (
              <Link
                href="/clans"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-sm font-bold text-pink transition hover:bg-surface-3"
              >
                Clan invites
                <span className="rounded-full bg-pink px-1.5 text-[11px] font-black text-void">
                  {clanInvites}
                </span>
              </Link>
            ) : null}
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
