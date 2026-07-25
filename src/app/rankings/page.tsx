import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/osu/Avatar";
import { ClanTag, CountryFlag } from "@/components/osu/badges";
import { CountryFilter } from "@/components/rankings/RankingFilters";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { PillLinks, SimplePager, TabLinks } from "@/components/ui/navigation";
import { getLeaderboard, type LeaderboardSort } from "@/lib/bancho/api";
import {
  formatAccuracy,
  formatCompact,
  formatNumber,
  formatPlaytime,
  formatPp,
} from "@/lib/format";
import { countryName } from "@/lib/osu/countries";
import { MODES_BY_GROUP, modeInfo, toMode } from "@/lib/osu/gamemodes";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Rankings",
  description: "Global and country performance rankings for every game mode.",
  path: "/rankings",
});

const PAGE_SIZE = 50;

const SORTS: { key: LeaderboardSort; label: string; title: string }[] = [
  { key: "pp", label: "Performance", title: "Sorted by performance points" },
  { key: "rscore", label: "Ranked score", title: "Sorted by ranked score" },
  { key: "tscore", label: "Total score", title: "Sorted by total score" },
  { key: "acc", label: "Accuracy", title: "Sorted by hit accuracy" },
  { key: "plays", label: "Play count", title: "Sorted by number of plays" },
  { key: "playtime", label: "Play time", title: "Sorted by time spent playing" },
];

function isSort(value: string | undefined): value is LeaderboardSort {
  return SORTS.some((sort) => sort.key === value);
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; sort?: string; country?: string; page?: string }>;
}) {
  const params = await searchParams;
  const mode = toMode(params.mode);
  const sort: LeaderboardSort = isSort(params.sort) ? params.sort : "pp";
  const country = (params.country ?? "").toLowerCase().slice(0, 2);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const entries = await getLeaderboard({
    mode,
    sort,
    country: country || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    const merged = { mode, sort, country, page, ...overrides };
    if (merged.mode) search.set("mode", String(merged.mode));
    if (merged.sort && merged.sort !== "pp") search.set("sort", String(merged.sort));
    if (merged.country) search.set("country", String(merged.country));
    if (merged.page && Number(merged.page) > 1) search.set("page", String(merged.page));
    const encoded = search.toString();
    return `/rankings${encoded ? `?${encoded}` : ""}`;
  };

  const info = modeInfo(mode);
  const offset = (page - 1) * PAGE_SIZE;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header>
        <p className="eyebrow">Leaderboards</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {country ? `${countryName(country)} rankings` : "Global rankings"}
        </h1>
        <p className="mt-1.5 text-sm text-dim">
          {info.fullName} · sorted by {SORTS.find((entry) => entry.key === sort)?.label.toLowerCase()}
        </p>
      </header>

      {/* mode selection, grouped as bancho.py groups its game modes */}
      <div className="mt-6 space-y-3">
        {MODES_BY_GROUP.map((group) => (
          <div key={group.group} className="flex flex-wrap items-center gap-3">
            <span className="w-20 flex-none text-[11px] font-bold uppercase tracking-wider text-faint">
              {group.label}
            </span>
            <PillLinks
              items={group.modes.map((entry) => ({
                href: buildHref({ mode: entry.id, page: 1 }),
                label: entry.name,
                active: entry.id === mode,
                title: entry.fullName,
              }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <TabLinks
          tabs={SORTS.map((entry) => ({
            href: buildHref({ sort: entry.key, page: 1 }),
            label: entry.label,
            active: entry.key === sort,
          }))}
        />
        <CountryFilter country={country} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            title={page > 1 ? "Nothing on this page" : "No ranked players yet"}
            description={
              page > 1
                ? "Go back a page to see the rest of the board."
                : country
                  ? `No ${countryName(country)} players have set a ranked score in ${info.fullName} yet.`
                  : `No players have set a ranked score in ${info.fullName} yet.`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
                  <th scope="col" className="w-14 px-3 py-2 text-left font-bold">
                    Rank
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-bold">
                    Player
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-bold">
                    Accuracy
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-bold">
                    Plays
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-right font-bold lg:table-cell">
                    Play time
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-right font-bold xl:table-cell">
                    Ranked score
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-center font-bold md:table-cell">
                    SS
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-center font-bold md:table-cell">
                    S
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-center font-bold md:table-cell">
                    A
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-bold">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const rank = entry.rank || offset + index + 1;
                  return (
                    <tr
                      key={entry.player_id}
                      className="border-b border-line/50 transition last:border-0 hover:bg-surface-2"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={
                            rank <= 3
                              ? "font-mono font-extrabold text-pink"
                              : "font-mono font-bold text-faint"
                          }
                        >
                          #{formatNumber(rank)}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar playerId={entry.player_id} name={entry.name} size={32} />
                          <Link
                            href={`/rankings?mode=${mode}&country=${entry.country}`}
                            className="flex-none"
                            title={`${countryName(entry.country)} rankings`}
                          >
                            <CountryFlag country={entry.country} />
                          </Link>
                          <ClanTag clanId={entry.clan_id} tag={entry.clan_tag} />
                          <Link
                            href={`/u/${entry.player_id}`}
                            className="truncate-flex font-bold text-ink transition hover:text-pink"
                          >
                            {entry.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-dim">{formatAccuracy(entry.acc)}</td>
                      <td className="px-2 py-2 text-right text-dim">
                        {formatNumber(entry.plays)}
                      </td>
                      <td className="hidden px-2 py-2 text-right text-dim lg:table-cell">
                        {formatPlaytime(entry.playtime)}
                      </td>
                      <td className="hidden px-2 py-2 text-right font-mono text-xs text-dim xl:table-cell">
                        {formatCompact(entry.rscore)}
                      </td>
                      <td className="hidden px-2 py-2 text-center text-xs text-dim md:table-cell">
                        {formatNumber(entry.xh_count + entry.x_count)}
                      </td>
                      <td className="hidden px-2 py-2 text-center text-xs text-dim md:table-cell">
                        {formatNumber(entry.sh_count + entry.s_count)}
                      </td>
                      <td className="hidden px-2 py-2 text-center text-xs text-dim md:table-cell">
                        {formatNumber(entry.a_count)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono font-extrabold text-pink">
                          {formatPp(entry.pp)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <SimplePager
        page={page}
        hasNext={entries.length === PAGE_SIZE}
        buildHref={(next) => buildHref({ page: next })}
      />
    </div>
  );
}
