import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag } from "@/components/osu/badges";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/ui/primitives";
import { getClan, getClanWithMembers, getPlayerStats } from "@/lib/bancho/api";
import type { ClanMember } from "@/lib/bancho/types";
import { formatAccuracy, formatDate, formatNumber, formatPp, formatRank } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const clan = await getClan(Number.parseInt(id, 10));
  if (!clan) return { title: "Clan not found" };
  return {
    title: `${clan.name} [${clan.tag}]`,
    description: `The ${clan.name} clan on the server: members and their standings.`,
  };
}

/** Ranks come back from the v1 API as words; sort by seniority. */
const RANK_ORDER: Record<string, number> = { Owner: 0, Officer: 1, Member: 2 };

export default async function ClanPage({ params }: Props) {
  const { id } = await params;
  const clanId = Number.parseInt(id, 10);
  if (!Number.isFinite(clanId)) notFound();

  const clan = await getClan(clanId);
  if (!clan) notFound();

  const detail = await getClanWithMembers(clanId);
  const members = detail?.members ?? [];

  // each member's standing in vanilla osu!, which is the common yardstick
  const withStats = await Promise.all(
    members.map(async (member) => ({
      member,
      stats: await getPlayerStats(member.id, 0),
    })),
  );

  withStats.sort((a, b) => {
    const byRank = (RANK_ORDER[a.member.rank] ?? 9) - (RANK_ORDER[b.member.rank] ?? 9);
    return byRank !== 0 ? byRank : (b.stats?.pp ?? 0) - (a.stats?.pp ?? 0);
  });

  const totalPp = withStats.reduce((sum, entry) => sum + (entry.stats?.pp ?? 0), 0);
  const ranked = withStats.filter((entry) => entry.stats?.pp);
  const averagePp = ranked.length > 0 ? totalPp / ranked.length : 0;
  const bestRank = ranked.reduce<number | null>((best, entry) => {
    const rank = entry.stats?.rank ?? null;
    if (rank === null) return best;
    return best === null || rank < best ? rank : best;
  }, null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="panel flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-16 w-16 flex-none place-items-center rounded-xl bg-pink/15 text-xl font-black text-pink ring-1 ring-inset ring-pink/25">
          {clan.tag.slice(0, 4)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Clan</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink">{clan.name}</h1>
          <p className="mt-0.5 text-sm text-faint">
            [{clan.tag}] · founded {formatDate(clan.created_at)}
          </p>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="panel px-4 py-3">
          <Stat label="Members" value={formatNumber(members.length)} />
        </div>
        <div className="panel px-4 py-3">
          <Stat label="Combined pp" value={formatPp(totalPp)} sub="osu! standard" />
        </div>
        <div className="panel px-4 py-3">
          <Stat label="Average pp" value={formatPp(averagePp)} sub="ranked members" />
        </div>
        <div className="panel px-4 py-3">
          <Stat label="Best rank" value={bestRank ? formatRank(bestRank) : "–"} />
        </div>
      </dl>

      <Panel className="mt-5">
        <PanelHeader title="Members" />
        {members.length === 0 ? (
          <EmptyState
            title="No visible members"
            description="Restricted and unverified players are not listed."
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {withStats.map(({ member, stats }) => (
              <li key={member.id}>
                <Link
                  href={`/u/${member.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                >
                  <Avatar playerId={member.id} name={member.name} size={38} />
                  <CountryFlag country={member.country} />
                  <div className="min-w-0 flex-1">
                    <span className="truncate-flex block font-bold text-ink">{member.name}</span>
                    <RankLabel rank={member.rank} />
                  </div>
                  {stats ? (
                    <div className="flex flex-none items-center gap-4 text-right">
                      <span className="hidden text-xs text-faint sm:block">
                        {formatAccuracy(stats.acc)}
                      </span>
                      <div>
                        <p className="font-mono text-sm font-extrabold text-pink">
                          {formatPp(stats.pp)}
                          <span className="ml-0.5 text-[11px] text-pink-lo">pp</span>
                        </p>
                        <p className="text-xs text-faint">{formatRank(stats.rank)}</p>
                      </div>
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function RankLabel({ rank }: { rank: ClanMember["rank"] }) {
  const tones: Record<string, string> = {
    Owner: "text-gold",
    Officer: "text-sky",
    Member: "text-faint",
  };
  return <span className={`text-xs font-bold ${tones[rank] ?? "text-faint"}`}>{rank}</span>;
}
