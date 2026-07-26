"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/osu/Avatar";
import { PlayerSearch } from "@/components/layout/PlayerSearch";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button, ButtonLink } from "@/components/ui/primitives";
import type { Player } from "@/lib/bancho/types";
import { cn } from "@/lib/cn";
import { config } from "@/lib/config";
import { formatNumber } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/rankings", label: "Rankings" },
  { href: "/beatmaps", label: "Beatmaps" },
  { href: "/clans", label: "Clans" },
  { href: "/multiplayer", label: "Multiplayer" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/docs/connect", label: "Get started" },
];

export function Header({
  player,
  onlinePlayers,
  clanInvites = 0,
}: {
  player: Player | null;
  onlinePlayers: number | null;
  /** Pending clan invites, surfaced on the account menu. */
  clanInvites?: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label={`${config.serverName} home`}
        >
          <Logo />
          <span className="hidden truncate text-lg font-black tracking-tight text-ink sm:block">
            {config.serverName}
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-0.5 xl:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative rounded-md px-2 py-2 text-sm font-bold transition",
                isActive(item.href)
                  ? "text-pink"
                  : "text-dim hover:bg-surface-2 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <PlayerSearch className="hidden md:block" />
          <OnlineBadge count={onlinePlayers} />

          {player ? (
            <UserMenu player={player} clanInvites={clanInvites} />
          ) : (
            // signing in stays one tap away at every width; the longer
            // call to action waits until there is room for it
            <div className="flex items-center gap-2">
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm" className="hidden sm:inline-flex">
                Create account
              </ButtonLink>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="xl:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={mobileOpen} />
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-nav" className="border-t border-line bg-void px-4 py-3 xl:hidden">
          <PlayerSearch className="mb-3 md:hidden" />
          <nav className="grid gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-bold transition",
                  isActive(item.href) ? "bg-pink/10 text-pink" : "text-dim hover:bg-surface-2",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {player ? (
            <Link
              href={`/u/${player.id}`}
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center gap-2 rounded-md bg-surface px-3 py-2"
            >
              <Avatar playerId={player.id} name={player.name} size={28} />
              <span className="font-bold text-ink">{player.name}</span>
            </Link>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ButtonLink href="/login" variant="secondary" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Create account
              </ButtonLink>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}

/** The wordmark's hit-circle: the same shape the hero and spinner use. */
function Logo() {
  return (
    <span className="relative grid h-8 w-8 place-items-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-[3px] border-white/90 bg-gradient-to-br from-pink to-pink-lo shadow-[0_0_12px_rgb(255_102_171/0.45)]" />
      <span className="absolute inset-[7px] rounded-full bg-void/35" />
    </span>
  );
}

function OnlineBadge({ count }: { count: number | null }) {
  if (count === null) return null;
  return (
    <Link
      href="/rankings"
      className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-dim transition hover:border-mint/40 hover:text-ink sm:flex"
      title="Players connected to the game server right now"
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-mint animate-live" aria-hidden="true" />
      {formatNumber(count)}
      <span className="text-faint">online</span>
    </Link>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M4 4l10 10M14 4L4 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M2 5h14M2 9h14M2 13h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
