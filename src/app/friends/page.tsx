import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag, RoleBadgeRow } from "@/components/osu/badges";
import { ButtonLink, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getFriends, getPlayerStats } from "@/lib/bancho/api";
import { getCurrentPlayer } from "@/lib/bancho/session";
import { formatPp, formatRank, formatRelative } from "@/lib/format";
import { modeInfo } from "@/lib/osu/gamemodes";

export const metadata: Metadata = {
  title: "Friends",
  description: "The players you have added as friends.",
};

export default async function FriendsPage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/friends");

  const friends = await getFriends(player.id);

  // show each friend's standing in the mode they themselves prefer
  const withStats = await Promise.all(
    friends.map(async (friend) => ({
      friend,
      stats: await getPlayerStats(friend.id, friend.preferred_mode),
    })),
  );

  withStats.sort((a, b) => (b.stats?.pp ?? 0) - (a.stats?.pp ?? 0));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <p className="eyebrow">Social</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Friends</h1>
        <p className="mt-1.5 text-sm text-dim">
          {friends.length === 0
            ? "You have not added anyone yet."
            : `${friends.length} ${friends.length === 1 ? "player" : "players"}. Only you can see this list.`}
        </p>
      </header>

      <Panel className="mt-6">
        <PanelHeader title="Your friends" />
        {friends.length === 0 ? (
          <EmptyState
            title="No friends yet"
            description="Find someone on the rankings or search for them by name, then add them from their profile."
            action={
              <ButtonLink href="/rankings" size="sm" className="mt-1">
                Browse rankings
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {withStats.map(({ friend, stats }) => (
              <li key={friend.id}>
                <Link
                  href={`/u/${friend.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                >
                  <Avatar playerId={friend.id} name={friend.name} size={40} />
                  <CountryFlag country={friend.country} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate-flex font-bold text-ink">{friend.name}</span>
                      <RoleBadgeRow priv={friend.priv} />
                    </div>
                    <p className="text-xs text-faint">
                      {modeInfo(friend.preferred_mode).fullName} · last seen{" "}
                      {formatRelative(friend.latest_activity)}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-mono text-sm font-extrabold text-pink">
                      {stats ? formatPp(stats.pp) : "–"}
                      <span className="ml-0.5 text-[11px] text-pink-lo">pp</span>
                    </p>
                    <p className="text-xs text-faint">{stats ? formatRank(stats.rank) : "–"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
