"use client";

import Link from "next/link";
import { useState } from "react";

import { RankChip, StatusLine, useClanAction } from "@/components/clans/shell";
import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag } from "@/components/osu/badges";
import { Button } from "@/components/ui/primitives";
import {
  kickClanMember,
  setClanMemberRank,
  transferClan,
} from "@/lib/bancho/clan-client";
import type { Clan, ClanMembership, ClanRosterMember } from "@/lib/bancho/clan-types";
import type { PlayerStats } from "@/lib/bancho/types";
import { formatAccuracy, formatPp, formatRank } from "@/lib/format";

export type RosterEntry = {
  member: ClanRosterMember;
  stats: PlayerStats | null;
};

/**
 * The clan's members, with management controls inline for whoever may use
 * them. One list rather than a public roster and a separate admin copy, so
 * there is a single place to look for who is in the clan.
 */
export function ClanRoster({
  clan,
  membership,
  entries,
  viewerId,
}: {
  clan: Clan;
  membership: ClanMembership | null;
  entries: RosterEntry[];
  viewerId: number | null;
}) {
  return (
    <ul className="divide-y divide-line/60">
      {entries.map((entry) => (
        <RosterRow
          key={entry.member.id}
          clan={clan}
          membership={membership}
          entry={entry}
          viewerId={viewerId}
        />
      ))}
    </ul>
  );
}

function RosterRow({
  clan,
  membership,
  entry,
  viewerId,
}: {
  clan: Clan;
  membership: ClanMembership | null;
  entry: RosterEntry;
  viewerId: number | null;
}) {
  const { member, stats } = entry;
  const { busy, status, run } = useClanAction();
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);

  const isSelf = member.id === viewerId;
  const isOfficer = member.clan_priv === 2;
  // an officer may only remove ordinary members; the owner may remove anyone
  const canKick =
    !isSelf && membership?.can_kick && member.clan_priv < membership.clan_priv;
  const canRank = !isSelf && membership?.can_manage_ranks;
  const canTransfer = !isSelf && membership?.can_transfer;
  const hasActions = canKick || canRank || canTransfer;

  return (
    <li className={busy ? "opacity-60" : undefined}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Link
          href={`/u/${member.id}`}
          className="group flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar playerId={member.id} name={member.name} size={38} />
          <CountryFlag country={member.country} />
          <div className="min-w-0">
            <span className="truncate-flex block font-bold text-ink group-hover:text-pink">
              {member.name}
            </span>
            <RankChip clanPriv={member.clan_priv} />
          </div>
        </Link>

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

        {hasActions ? (
          <div className="flex flex-none flex-wrap gap-1.5">
            {canRank ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => setClanMemberRank(clan.id, member.id, isOfficer ? 1 : 2),
                    isOfficer
                      ? `${member.name} is now a member.`
                      : `${member.name} is now an officer.`,
                  )
                }
              >
                {isOfficer ? "Demote" : "Promote"}
              </Button>
            ) : null}
            {canTransfer ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmingTransfer(true)}
              >
                Make owner
              </Button>
            ) : null}
            {canKick ? (
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => kickClanMember(clan.id, member.id),
                    `${member.name} was removed from the clan.`,
                  )
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {confirmingTransfer ? (
        <div className="mx-4 mb-3 rounded-md border border-gold/40 bg-gold/5 p-3">
          <p className="text-xs leading-relaxed text-dim">
            Hand {clan.name} to <strong className="text-ink">{member.name}</strong>? You
            become an officer and cannot take it back yourself.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => transferClan(clan.id, member.id),
                  `${member.name} now owns the clan.`,
                )
              }
            >
              Transfer ownership
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingTransfer(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {status ? (
        <div className="px-4 pb-3">
          <StatusLine status={status} />
        </div>
      ) : null}
    </li>
  );
}
