import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerActionPanels } from "@/components/admin/PlayerActions";
import { AdminHeader, AuditLogList, StateChip } from "@/components/admin/shell";
import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag } from "@/components/osu/badges";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import {
  getAdminCapabilities,
  getAuditLog,
  getPlayerAdminView,
  getPlayerHardwareMatches,
  getPlayerLogins,
} from "@/lib/bancho/admin";
import type { HardwareMatch, LoginRecord } from "@/lib/bancho/admin-types";
import { getCurrentPlayer } from "@/lib/bancho/session";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { describeDuration } from "@/lib/osu/admin";
import { clanRankLabel, privilegeLabels } from "@/lib/osu/privileges";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Player administration",
  robots: { index: false, follow: false },
};

export default async function AdminPlayerPage({ params }: Props) {
  const { id } = await params;
  const playerId = Number.parseInt(id, 10);
  if (!Number.isFinite(playerId)) notFound();

  const [capabilities, player, viewer] = await Promise.all([
    getAdminCapabilities(),
    getPlayerAdminView(playerId),
    getCurrentPlayer(),
  ]);

  if (!capabilities || !viewer) return null;
  if (!player) notFound();

  const [history, logins, hardware] = await Promise.all([
    capabilities.view_audit_log
      ? getAuditLog({ subjectId: player.id, pageSize: 50 })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
    capabilities.view_player_investigation
      ? getPlayerLogins(player.id, { pageSize: 15 })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
    capabilities.view_player_investigation
      ? getPlayerHardwareMatches(player.id)
      : Promise.resolve([]),
  ]);

  const isSelf = viewer.id === player.id;

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Player administration"
        title={player.name}
        action={
          <Link
            href={`/u/${player.id}`}
            className="rounded-md border border-line-bright bg-surface-3 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-line-bright"
          >
            Public profile →
          </Link>
        }
      />

      {/* the state that decides which actions make sense */}
      <Panel className="flex flex-wrap items-center gap-4 p-4">
        <Avatar playerId={player.id} name={player.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CountryFlag country={player.country} showName />
            <span className="font-mono text-xs text-faint">#{player.id}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {player.is_online ? <StateChip label="Online" tone="good" /> : null}
            {player.restricted ? <StateChip label="Restricted" tone="bad" /> : null}
            {player.silenced ? (
              <StateChip
                label="Silenced"
                tone="warn"
                detail={describeDuration(player.remaining_silence_seconds)}
              />
            ) : null}
            {player.is_donor ? (
              <StateChip
                label="Donator"
                tone="neutral"
                detail={`until ${formatDate(player.donor_end)}`}
              />
            ) : null}
            {isSelf ? <StateChip label="This is you" tone="neutral" /> : null}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
          <Fact label="Joined" value={formatDate(player.creation_time)} />
          <Fact label="Last seen" value={formatRelative(player.latest_activity)} />
          <Fact label="Game logins" value={formatNumber(player.login_count)} />
          {player.clan_id ? (
            <div>
              <dt className="text-faint">Clan</dt>
              <dd className="font-bold text-ink">
                <Link
                  href={`/admin/clans/${player.clan_id}`}
                  className="transition hover:text-pink"
                >
                  {clanRankLabel(player.clan_priv)} of clan #{player.clan_id}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <section>
        <h2 className="eyebrow">Privileges held</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {privilegeLabels(player.priv).length === 0 ? (
            <span className="text-sm text-faint">None.</span>
          ) : (
            privilegeLabels(player.priv).map((label) => (
              <StateChip key={label} label={label} />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="eyebrow">Actions</h2>
        <div className="mt-3">
          <PlayerActionPanels
            player={player}
            capabilities={capabilities}
            isSelf={isSelf}
          />
        </div>
      </section>

      {capabilities.view_audit_log ? (
        <Panel>
          <PanelHeader title={`History · ${formatNumber(history.total)} entries`} />
          <AuditLogList entries={history.items} showSubject={false} />
        </Panel>
      ) : null}

      {capabilities.view_player_investigation ? (
        <>
          <LoginHistory logins={logins.items} total={logins.total} />
          <HardwareMatches matches={hardware} playerName={player.name} />
        </>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="font-mono text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

function LoginHistory({ logins, total }: { logins: LoginRecord[]; total: number }) {
  return (
    <Panel>
      <PanelHeader title={`Game logins · ${formatNumber(total)}`} />
      {logins.length === 0 ? (
        <EmptyState
          title="No logins recorded"
          description="This account has never connected from the osu! client."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
                <th scope="col" className="px-4 py-2 text-left font-bold">
                  When
                </th>
                <th scope="col" className="px-2 py-2 text-left font-bold">
                  Address
                </th>
                <th scope="col" className="px-2 py-2 text-left font-bold">
                  Client
                </th>
                <th scope="col" className="px-4 py-2 text-left font-bold">
                  Stream
                </th>
              </tr>
            </thead>
            <tbody>
              {logins.map((login) => (
                <tr key={login.id} className="border-b border-line/50 last:border-0">
                  <td
                    className="whitespace-nowrap px-4 py-2 text-dim"
                    title={formatDateTime(login.created_at)}
                  >
                    {formatRelative(login.created_at)}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-ink">{login.ip}</td>
                  <td className="px-2 py-2 font-mono text-xs text-dim">
                    {login.osu_version}
                  </td>
                  <td className="px-4 py-2 text-xs text-dim">{login.osu_stream}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function HardwareMatches({
  matches,
  playerName,
}: {
  matches: HardwareMatch[];
  playerName: string;
}) {
  return (
    <Panel>
      <PanelHeader title={`Accounts sharing hardware · ${matches.length}`} />
      <p className="border-b border-line px-4 py-2.5 text-xs leading-relaxed text-faint">
        Other accounts whose osu! client reported the same install id, network
        adapters or disk serial as {playerName}. A match is a strong signal of
        multi-accounting, but shared machines and households do happen — check
        the login history before acting.
      </p>
      {matches.length === 0 ? (
        <EmptyState
          title="No matches"
          description="No other account shares this player's hardware identifiers."
        />
      ) : (
        <ul className="divide-y divide-line/60">
          {matches.map((match) => (
            <li key={`${match.player_id}-${match.osu_path}`}>
              <Link
                href={`/admin/players/${match.player_id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
              >
                <Avatar playerId={match.player_id} name={match.player_name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate-flex font-bold text-ink">{match.player_name}</p>
                  <p className="text-xs text-faint">
                    {privilegeLabels(match.priv).join(", ") || "No privileges"} · seen{" "}
                    {match.occurrences} {match.occurrences === 1 ? "time" : "times"} · last{" "}
                    {formatRelative(match.last_seen)}
                  </p>
                </div>
                <dl className="grid gap-0.5 font-mono text-[10px] text-faint">
                  <div className="flex gap-1">
                    <dt>adapters</dt>
                    <dd className="text-dim">{match.adapters.slice(0, 12)}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>install</dt>
                    <dd className="text-dim">{match.uninstall_id.slice(0, 12)}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>disk</dt>
                    <dd className="text-dim">{match.disk_serial.slice(0, 12)}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
