import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClanManagement } from "@/components/clans/ClanManagement";
import { ClanRoster } from "@/components/clans/ClanRoster";
import { RankChip } from "@/components/clans/shell";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/ui/primitives";
import { getClan, getPlayerStats } from "@/lib/bancho/api";
import { getClanInvites, getClanMembership, getClanRoster } from "@/lib/bancho/clans";
import { getCurrentPlayer } from "@/lib/bancho/session";
import { formatDate, formatNumber, formatPp, formatRank } from "@/lib/format";

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

export default async function ClanPage({ params }: Props) {
  const { id } = await params;
  const clanId = Number.parseInt(id, 10);
  if (!Number.isFinite(clanId)) notFound();

  const clan = await getClan(clanId);
  if (!clan) notFound();

  const [members, membership, viewer] = await Promise.all([
    getClanRoster(clanId),
    getClanMembership(clanId),
    getCurrentPlayer(),
  ]);

  // only a clan's own officers may read its outstanding invites
  const invites = membership?.can_invite ? await getClanInvites(clanId) : [];

  // each member's standing in vanilla osu!, which is the common yardstick
  const withStats = await Promise.all(
    members.map(async (member) => ({
      member,
      stats: await getPlayerStats(member.id, 0),
    })),
  );

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
        {membership?.is_member ? (
          <div className="flex flex-none flex-col items-end gap-1">
            <span className="text-xs text-faint">Your rank</span>
            <RankChip clanPriv={membership.clan_priv} />
          </div>
        ) : null}
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 [&>*]:min-w-0">
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
          <ClanRoster
            clan={clan}
            membership={membership}
            entries={withStats}
            viewerId={viewer?.id ?? null}
          />
        )}
      </Panel>

      {membership && (membership.is_member || membership.can_disband) ? (
        <ClanManagement clan={clan} membership={membership} invites={invites} />
      ) : null}
    </div>
  );
}
