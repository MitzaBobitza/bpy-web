import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/osu/Avatar";
import {
  ClanTag,
  CountryLink,
  CustomBadge,
  GradeBadge,
  RoleBadgeRow,
  StatusBadge,
} from "@/components/osu/badges";
import { ScoreRow } from "@/components/osu/ScoreRow";
import { FriendButton } from "@/components/profile/FriendButton";
import { TopPlaysChart } from "@/components/profile/TopPlaysChart";
import { PillLinks } from "@/components/ui/navigation";
import { EmptyState, Panel, PanelHeader, Stat } from "@/components/ui/primitives";
import {
  getAllPlayerStats,
  getClan,
  getFriends,
  getPlayer,
  getPlayerMostPlayed,
  getPlayerScores,
  getPlayerStats,
  getPlayerStatus,
} from "@/lib/bancho/api";
import { getCurrentPlayer } from "@/lib/bancho/session";
import type { PlayerStats } from "@/lib/bancho/types";
import {
  formatAccuracy,
  formatCompact,
  formatDate,
  formatNumber,
  formatPlaytime,
  formatPp,
  formatRank,
  formatRelative,
  isStillActive,
} from "@/lib/format";
import { MODE_LIST, modeInfo, toMode } from "@/lib/osu/gamemodes";
import {
  actionLabel,
  clanRankLabel,
  hasStaffAccess,
  playStyleLabels,
} from "@/lib/osu/privileges";
import { pageMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ idOrName: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { idOrName } = await params;
  const player = await getPlayer(decodeURIComponent(idOrName));
  if (!player) return { title: "Player not found" };
  return pageMetadata({
    title: player.name,
    description: `${player.name}'s osu! profile: ranks, top plays and statistics.`,
    path: `/u/${player.id}`,
    type: "profile",
    image: "own",
  });
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { idOrName } = await params;
  const { mode: modeParam } = await searchParams;

  const player = await getPlayer(decodeURIComponent(idOrName));
  if (!player) notFound();

  // default to whichever mode the player themselves prefers
  const mode = toMode(modeParam ?? player.preferred_mode);
  const info = modeInfo(mode);

  const [stats, allStats, best, recent, mostPlayed, status, clan, viewer] = await Promise.all([
    getPlayerStats(player.id, mode),
    getAllPlayerStats(player.id),
    getPlayerScores(player.id, { scope: "best", mode, limit: 50 }),
    getPlayerScores(player.id, { scope: "recent", mode, limit: 15 }),
    getPlayerMostPlayed(player.id, mode, 12),
    getPlayerStatus(player.id),
    player.clan_id ? getClan(player.clan_id) : Promise.resolve(null),
    getCurrentPlayer(),
  ]);

  const isSelf = viewer?.id === player.id;
  // only the signed-in player can read their own friends list, which is
  // exactly what decides whether the button says add or remove
  const viewerFriends = viewer && !isSelf ? await getFriends(viewer.id) : [];
  const alreadyFriends = viewerFriends.some((friend) => friend.id === player.id);

  const playedModes = new Set(allStats.filter((entry) => entry.plays > 0).map((e) => e.mode));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <ProfileHeader
        player={player}
        clanName={clan?.name ?? null}
        status={status}
        action={
          viewer && !isSelf ? (
            <FriendButton
              viewerId={viewer.id}
              targetId={player.id}
              initiallyFriends={alreadyFriends}
            />
          ) : isSelf ? (
            <Link
              href="/settings"
              className="rounded-md border border-line-bright bg-surface-3 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-line-bright"
            >
              Edit profile
            </Link>
          ) : null
        }
        staffAction={
          viewer && hasStaffAccess(viewer.priv) ? (
            <Link
              href={`/admin/players/${player.id}`}
              className="rounded-md border border-violet/40 bg-violet/10 px-3 py-1.5 text-xs font-bold text-violet transition hover:bg-violet/20"
            >
              Manage
            </Link>
          ) : null
        }
      />

      {/* mode switcher; modes with no plays are noted in the tooltip */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Mode</span>
        <PillLinks
          items={MODE_LIST.map((entry) => ({
            href: `/u/${player.id}?mode=${entry.id}`,
            label: entry.shortName,
            active: entry.id === mode,
            title: playedModes.has(entry.id)
              ? entry.fullName
              : `${entry.fullName} — not played yet`,
          }))}
        />
      </div>

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-5">
          <RanksPanel stats={stats} country={player.country} mode={mode} />
          <StatisticsPanel stats={stats} />
          <GradesPanel stats={stats} />
          <DetailsPanel
            player={player}
            clanName={clan?.name ?? null}
            clanTag={clan?.tag ?? null}
            modeLabel={info.fullName}
          />
        </div>

        <div className="space-y-5">
          {player.userpage_content ? (
            <Panel>
              <PanelHeader title="About" />
              <div className="prose-osu whitespace-pre-wrap px-4 py-4 text-sm">
                {player.userpage_content}
              </div>
            </Panel>
          ) : null}

          {best.length >= 8 ? (
            <Panel className="px-4 py-4">
              <TopPlaysChart scores={best} />
            </Panel>
          ) : null}

          <Panel>
            <PanelHeader title={`Top plays · ${info.fullName}`} />
            {best.length === 0 ? (
              <EmptyState
                title="No ranked plays yet"
                description={`${player.name} has not set a scoring play in ${info.fullName}.`}
              />
            ) : (
              <ul className="space-y-1 p-2">
                {best.slice(0, 25).map((score, index) => (
                  <ScoreRow key={score.id} score={score} index={index} showWeight />
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Recent plays" />
            {recent.length === 0 ? (
              <EmptyState title="No recent plays" />
            ) : (
              <ul className="space-y-1 p-2">
                {recent.map((score) => (
                  <ScoreRow key={score.id} score={score} />
                ))}
              </ul>
            )}
          </Panel>

          <MostPlayedPanel maps={mostPlayed} />
        </div>
      </div>
    </div>
  );
}

/* ── header ────────────────────────────────────────────────────────────── */

function ProfileHeader({
  player,
  clanName,
  status,
  action,
  staffAction,
}: {
  player: Awaited<ReturnType<typeof getPlayer>> & object;
  clanName: string | null;
  status: Awaited<ReturnType<typeof getPlayerStatus>>;
  action: React.ReactNode;
  staffAction: React.ReactNode;
}) {
  const hue = (player.id * 47) % 360;

  return (
    <header className="overflow-hidden rounded-panel border border-line">
      {/* cover band, tinted from the player's id so every profile differs */}
      <div
        className="relative h-24 sm:h-28"
        style={{
          background:
            `linear-gradient(120deg, hsl(${hue} 38% 22%), hsl(${(hue + 50) % 360} 34% 13%))`,
        }}
      >
        <div className="absolute inset-0 hatched" aria-hidden="true" />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: "linear-gradient(to top, rgb(34 24 34 / 0.96), transparent 70%)" }}
        />
      </div>

      <div className="relative bg-surface px-4 pb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="-mt-10 sm:-mt-14">
            <Avatar
              playerId={player.id}
              name={player.name}
              size={104}
              className="ring-4 ring-surface"
            />
          </div>

          <div className="min-w-0 flex-1 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {clanName ? <ClanTag clanId={player.clan_id} tag={clanName} /> : null}
              <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                {player.name}
              </h1>
              {status ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint"
                  title={status.info_text || undefined}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
                  {actionLabel(status.action)}
                </span>
              ) : (
                <span className="text-xs text-faint">
                  Last seen {formatRelative(player.latest_activity)}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <CountryLink country={player.country} mode={player.preferred_mode} />
              <RoleBadgeRow priv={player.priv} />
              {player.custom_badge_name ? <CustomBadge name={player.custom_badge_name} /> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-1">
            {staffAction}
            {action}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── side panels ───────────────────────────────────────────────────────── */

function RanksPanel({
  stats,
  country,
  mode,
}: {
  stats: PlayerStats | null;
  country: string;
  mode: number;
}) {
  return (
    <Panel>
      <PanelHeader title="Ranks" />
      <div className="grid grid-cols-2 gap-4 px-4 py-4">
        <div className="col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Performance</p>
          <p className="font-mono text-3xl font-black text-pink">
            {stats ? formatPp(stats.pp) : "–"}
            <span className="ml-1 text-sm font-bold text-pink-lo">pp</span>
          </p>
        </div>
        <Stat label="Global" value={stats ? formatRank(stats.rank) : "–"} />
        <Stat
          label="Country"
          value={
            stats?.country_rank ? (
              <Link
                href={`/rankings?mode=${mode}&country=${country}`}
                className="transition hover:text-pink"
              >
                {formatRank(stats.country_rank)}
              </Link>
            ) : (
              "–"
            )
          }
        />
      </div>
    </Panel>
  );
}

function StatisticsPanel({ stats }: { stats: PlayerStats | null }) {
  if (!stats) {
    return (
      <Panel>
        <PanelHeader title="Statistics" />
        <EmptyState title="No statistics for this mode" />
      </Panel>
    );
  }

  const rows: [string, string][] = [
    ["Ranked score", formatNumber(stats.rscore)],
    ["Total score", formatNumber(stats.tscore)],
    ["Hit accuracy", formatAccuracy(stats.acc)],
    ["Play count", formatNumber(stats.plays)],
    ["Play time", formatPlaytime(stats.playtime)],
    ["Total hits", formatNumber(stats.total_hits)],
    ["Maximum combo", `${formatNumber(stats.max_combo)}x`],
    ["Replays watched", formatNumber(stats.replay_views)],
  ];

  return (
    <Panel>
      <PanelHeader title="Statistics" />
      <dl className="divide-y divide-line/60">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-faint">{label}</dt>
            <dd className="font-mono text-sm font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/**
 * Grade counts. These are four labelled quantities, not a distribution
 * worth plotting — so they are stat tiles carrying the game's own grade
 * badges rather than a chart.
 */
function GradesPanel({ stats }: { stats: PlayerStats | null }) {
  if (!stats) return null;

  const grades: [string, number][] = [
    ["XH", stats.xh_count],
    ["X", stats.x_count],
    ["SH", stats.sh_count],
    ["S", stats.s_count],
    ["A", stats.a_count],
  ];

  return (
    <Panel>
      <PanelHeader title="Grades" />
      <ul className="flex flex-wrap justify-between gap-2 px-4 py-4">
        {grades.map(([grade, count]) => (
          <li key={grade} className="flex flex-col items-center gap-1.5">
            <GradeBadge grade={grade} size="sm" />
            <span className="font-mono text-sm font-bold text-dim">{formatCompact(count)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function DetailsPanel({
  player,
  clanName,
  clanTag,
  modeLabel,
}: {
  player: Awaited<ReturnType<typeof getPlayer>> & object;
  clanName: string | null;
  clanTag: string | null;
  modeLabel: string;
}) {
  const styles = playStyleLabels(player.play_style);
  const donorActive = isStillActive(player.donor_end);

  return (
    <Panel>
      <PanelHeader title="Details" />
      <dl className="divide-y divide-line/60">
        <Row label="Joined" value={formatDate(player.creation_time)} />
        <Row label="Preferred mode" value={modeLabel} />
        {styles.length > 0 ? <Row label="Plays with" value={styles.join(", ")} /> : null}
        {clanName ? (
          <Row
            label="Clan"
            value={
              <Link href={`/clans/${player.clan_id}`} className="text-pink hover:text-pink-hi">
                {clanTag ? `[${clanTag}] ` : ""}
                {clanName} · {clanRankLabel(player.clan_priv)}
              </Link>
            }
          />
        ) : null}
        {donorActive ? (
          <Row label="Supporter until" value={formatDate(player.donor_end)} />
        ) : null}
        <Row label="Player ID" value={<span className="font-mono">{player.id}</span>} />
      </dl>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className="flex-none text-xs text-faint">{label}</dt>
      <dd className="text-right text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

/* ── most played ───────────────────────────────────────────────────────── */

function MostPlayedPanel({
  maps,
}: {
  maps: Awaited<ReturnType<typeof getPlayerMostPlayed>>;
}) {
  return (
    <Panel>
      <PanelHeader title="Most played beatmaps" />
      {maps.length === 0 ? (
        <EmptyState title="No plays recorded" />
      ) : (
        <ul className="divide-y divide-line/60">
          {maps.map((map) => (
            <li key={map.id}>
              <Link
                href={`/beatmaps/${map.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate-flex text-sm font-bold text-ink">
                      {map.artist} - {map.title}
                    </span>
                    <StatusBadge status={map.status} />
                  </div>
                  <p className="truncate-flex text-xs text-faint">
                    [{map.version}] · mapped by {map.creator}
                  </p>
                </div>
                <span className="flex-none font-mono text-sm font-bold text-dim">
                  {formatNumber(map.plays)}
                  <span className="ml-1 text-[11px] text-faint">plays</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
