import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag, RoleBadgeRow } from "@/components/osu/badges";
import { SearchInput } from "@/components/search/SearchInput";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getPlayer, getPlayerStats, searchPlayers } from "@/lib/bancho/api";
import { formatPp, formatRank, formatRelative } from "@/lib/format";
import { modeInfo } from "@/lib/osu/gamemodes";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Find players",
  description: "Search the server for players by name.",
  path: "/search",
});

/** Enough to be useful without a wall of profile lookups. */
const MAX_RESULTS = 30;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const tooShort = term.length > 0 && term.length < 2;

  const matches = term.length >= 2 ? await searchPlayers(term) : [];
  const results = await Promise.all(
    matches.slice(0, MAX_RESULTS).map(async (match) => {
      const player = await getPlayer(match.id);
      const stats = player ? await getPlayerStats(player.id, player.preferred_mode) : null;
      return { match, player, stats };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header>
        <p className="eyebrow">Search</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Find players</h1>
        <p className="mt-1.5 text-sm text-dim">
          Search by username. Two characters minimum.
        </p>
      </header>

      <div className="mt-5">
        <SearchInput initialTerm={term} />
      </div>

      {term.length === 0 ? null : tooShort ? (
        <Panel className="mt-5">
          <EmptyState title="Keep typing" description="Search needs at least two characters." />
        </Panel>
      ) : (
        <Panel className="mt-5">
          <PanelHeader
            title={`${matches.length} ${matches.length === 1 ? "player" : "players"} found`}
          />
          {matches.length === 0 ? (
            <EmptyState
              title={`Nothing matches “${term}”`}
              description="Check the spelling, or try a shorter part of the name."
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {results.map(({ match, player, stats }) => (
                <li key={match.id}>
                  <Link
                    href={`/u/${match.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <Avatar playerId={match.id} name={match.name} size={40} />
                    {player ? <CountryFlag country={player.country} /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate-flex font-bold text-ink">{match.name}</span>
                        {player ? <RoleBadgeRow priv={player.priv} /> : null}
                      </div>
                      {player ? (
                        <p className="text-xs text-faint">
                          {modeInfo(player.preferred_mode).fullName} · last seen{" "}
                          {formatRelative(player.latest_activity)}
                        </p>
                      ) : null}
                    </div>
                    {stats ? (
                      <div className="flex-none text-right">
                        <p className="font-mono text-sm font-extrabold text-pink">
                          {formatPp(stats.pp)}
                          <span className="ml-0.5 text-[11px] text-pink-lo">pp</span>
                        </p>
                        <p className="text-xs text-faint">{formatRank(stats.rank)}</p>
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
