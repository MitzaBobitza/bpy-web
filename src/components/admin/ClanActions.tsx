"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { ActionCard } from "@/components/admin/shell";
import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag } from "@/components/osu/badges";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import {
  assignClanOwner,
  disbandClanAsStaff,
  removeClanMemberAsStaff,
  renameClanAsStaff,
} from "@/lib/bancho/admin-client";
import type { AdminClanMember, AdminClanSummary } from "@/lib/bancho/admin-types";
import { ApiError } from "@/lib/bancho/client";
import {
  CLAN_NAME_MAX,
  CLAN_TAG_MAX,
  normaliseClanTag,
  validateClanName,
  validateClanTag,
} from "@/lib/osu/clans";
import { clanRankLabel, isRestricted, isVerified } from "@/lib/osu/privileges";

type Status = { tone: "success" | "error"; message: string } | null;

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus({ tone: "success", message: success });
      router.refresh();
      return true;
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Something went wrong.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, run };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div className="mt-3">
      <Alert tone={status.tone}>{status.message}</Alert>
    </div>
  );
}

/** Staff actions on one clan. Every one lands in the audit log. */
export function ClanActions({
  clan,
  members,
}: {
  clan: AdminClanSummary;
  members: AdminClanMember[];
}) {
  return (
    <div className="space-y-4">
      <RosterCard clan={clan} members={members} />
      <RenameCard clan={clan} />
      <DisbandCard clan={clan} />
    </div>
  );
}

function RosterCard({
  clan,
  members,
}: {
  clan: AdminClanSummary;
  members: AdminClanMember[];
}) {
  return (
    <ActionCard
      title="Members"
      description="Restricted and unverified members are listed here, unlike on the public page. The owner cannot be removed — hand the clan on instead."
    >
      <ul className="divide-y divide-line/60">
        {members.map((member) => (
          <MemberRow key={member.id} clan={clan} member={member} />
        ))}
      </ul>
    </ActionCard>
  );
}

function MemberRow({
  clan,
  member,
}: {
  clan: AdminClanSummary;
  member: AdminClanMember;
}) {
  const { busy, status, run } = useAction();
  const isOwner = member.clan_priv === 3;

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar playerId={member.id} name={member.name} size={30} />
        <CountryFlag country={member.country} />
        <Link
          href={`/admin/players/${member.id}`}
          className="min-w-0 flex-1 truncate text-sm font-bold text-ink transition hover:text-pink"
        >
          {member.name}
        </Link>

        {isRestricted(member.priv) ? (
          <span className="rounded bg-coral/15 px-1.5 py-0.5 text-[11px] font-bold text-coral">
            Restricted
          </span>
        ) : !isVerified(member.priv) ? (
          <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-bold text-faint">
            Never played
          </span>
        ) : null}

        <span className="text-xs font-bold text-dim">
          {clanRankLabel(member.clan_priv)}
        </span>

        {isOwner ? null : (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => assignClanOwner(clan.id, member.id),
                  `${member.name} now owns ${clan.name}.`,
                )
              }
            >
              Make owner
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => removeClanMemberAsStaff(clan.id, member.id),
                  `${member.name} was removed from ${clan.name}.`,
                )
              }
            >
              Remove
            </Button>
          </>
        )}
      </div>
      <StatusLine status={status} />
    </li>
  );
}

function RenameCard({ clan }: { clan: AdminClanSummary }) {
  const { busy, status, run } = useAction();
  const [name, setName] = useState(clan.name);
  const [tag, setTag] = useState(clan.tag);

  const nameCheck = validateClanName(name);
  const tagCheck = validateClanTag(tag);
  const unchanged = name.trim() === clan.name && normaliseClanTag(tag) === clan.tag;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await run(
      () =>
        renameClanAsStaff(clan.id, {
          ...(name.trim() !== clan.name ? { name: name.trim() } : {}),
          ...(normaliseClanTag(tag) !== clan.tag ? { tag: normaliseClanTag(tag) } : {}),
        }),
      "Clan renamed.",
    );
  }

  return (
    <ActionCard
      title="Name and tag"
      description="For a name or tag that breaks the rules, without taking the clan away from its members."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          <Field
            label="Name"
            htmlFor="staff-clan-name"
            error={name !== clan.name && !nameCheck.ok ? nameCheck.error : undefined}
          >
            <Input
              id="staff-clan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={CLAN_NAME_MAX}
            />
          </Field>
          <Field
            label="Tag"
            htmlFor="staff-clan-tag"
            error={tag !== clan.tag && !tagCheck.ok ? tagCheck.error : undefined}
            hint={`Saved as ${normaliseClanTag(tag) || "…"}`}
          >
            <Input
              id="staff-clan-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              maxLength={CLAN_TAG_MAX}
            />
          </Field>
        </div>
        <Button
          type="submit"
          disabled={busy || unchanged || !nameCheck.ok || !tagCheck.ok}
        >
          Save changes
        </Button>
      </form>
      <StatusLine status={status} />
    </ActionCard>
  );
}

function DisbandCard({ clan }: { clan: AdminClanSummary }) {
  const router = useRouter();
  const { busy, status, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  async function disband() {
    const done = await run(
      () => disbandClanAsStaff(clan.id),
      `${clan.name} was disbanded.`,
    );
    if (done) router.push("/admin/clans");
  }

  return (
    <ActionCard
      title="Disband"
      description="Every member loses the tag and any outstanding invites are withdrawn."
      destructive
    >
      {confirming ? (
        <div className="rounded-md border border-coral/40 bg-coral/5 p-3">
          <p className="text-xs leading-relaxed text-dim">
            Dissolve <strong className="text-ink">{clan.name}</strong> and remove all{" "}
            {clan.member_count} of its members? This cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="danger" size="sm" disabled={busy} onClick={disband}>
              Yes, disband
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" disabled={busy} onClick={() => setConfirming(true)}>
          Disband clan
        </Button>
      )}
      <StatusLine status={status} />
    </ActionCard>
  );
}
