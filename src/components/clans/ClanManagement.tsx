"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ManageCard, StatusLine, useClanAction } from "@/components/clans/shell";
import { Avatar } from "@/components/osu/Avatar";
import { Button, Field, Input } from "@/components/ui/primitives";
import {
  disbandClan,
  inviteToClan,
  leaveClan,
  revokeClanInvite,
  updateClan,
} from "@/lib/bancho/clan-client";
import type { Clan, ClanInvite, ClanMembership } from "@/lib/bancho/clan-types";
import { formatDate } from "@/lib/format";
import {
  CLAN_NAME_MAX,
  CLAN_TAG_MAX,
  normaliseClanTag,
  validateClanName,
  validateClanTag,
} from "@/lib/osu/clans";

/**
 * Everything a clan's members can do from the website, gated by the rank
 * the server reported. Each control mirrors a `!clan` chat command.
 */
export function ClanManagement({
  clan,
  membership,
  invites,
}: {
  clan: Clan;
  membership: ClanMembership;
  invites: ClanInvite[];
}) {
  return (
    <div className="mt-5 space-y-4">
      <div>
        <p className="eyebrow">Manage</p>
        <p className="mt-1 text-xs text-faint">
          The same actions as the in-game <code className="text-dim">!clan</code>{" "}
          commands. Promoting and removing members is done from the list above.
        </p>
      </div>

      {membership.can_invite ? (
        <InviteForm clanId={clan.id} invites={invites} />
      ) : null}

      {membership.can_edit ? <ClanSettings clan={clan} /> : null}

      <DangerZone clan={clan} membership={membership} />
    </div>
  );
}

// ── invitations ──────────────────────────────────────────────────────────

function InviteForm({ clanId, invites }: { clanId: number; invites: ClanInvite[] }) {
  const { busy, status, run } = useClanAction();
  const [username, setUsername] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const invited = await run(
      () => inviteToClan(clanId, username.trim()),
      `${username.trim()} was invited.`,
    );
    if (invited) setUsername("");
  }

  return (
    <ManageCard
      title="Invite a player"
      description="They keep playing as normal until they accept. Players already in a clan cannot be invited."
    >
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Field label="Username" htmlFor="clan-invite-username">
            <Input
              id="clan-invite-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Who should join?"
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={busy || username.trim().length === 0}>
          Send invite
        </Button>
      </form>
      <StatusLine status={status} />

      <div className="mt-4">
        <p className="eyebrow">Awaiting a reply ({invites.length})</p>
        {invites.length === 0 ? (
          <p className="mt-2 text-xs text-faint">No invites are outstanding.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line/60">
            {invites.map((invite) => (
              <InviteRow key={invite.id} clanId={clanId} invite={invite} />
            ))}
          </ul>
        )}
      </div>
    </ManageCard>
  );
}

function InviteRow({ clanId, invite }: { clanId: number; invite: ClanInvite }) {
  const { busy, status, run } = useClanAction();

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar playerId={invite.user_id} name={invite.username} size={28} />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
          {invite.username}
        </span>
        <span className="text-xs text-faint">{formatDate(invite.created_at)}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            run(
              () => revokeClanInvite(clanId, invite.id),
              `The invite to ${invite.username} was withdrawn.`,
            )
          }
        >
          Withdraw
        </Button>
      </div>
      <StatusLine status={status} />
    </li>
  );
}

// ── settings ─────────────────────────────────────────────────────────────

function ClanSettings({ clan }: { clan: Clan }) {
  const { busy, status, run } = useClanAction();
  const [name, setName] = useState(clan.name);
  const [tag, setTag] = useState(clan.tag);

  const nameCheck = validateClanName(name);
  const tagCheck = validateClanTag(tag);
  const unchanged = name.trim() === clan.name && normaliseClanTag(tag) === clan.tag;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await run(
      () =>
        updateClan(clan.id, {
          ...(name.trim() !== clan.name ? { name: name.trim() } : {}),
          ...(normaliseClanTag(tag) !== clan.tag ? { tag: normaliseClanTag(tag) } : {}),
        }),
      "Clan updated.",
    );
  }

  return (
    <ManageCard
      title="Name and tag"
      description="The tag appears in front of every member's name in game."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          <Field
            label="Name"
            htmlFor="clan-name"
            error={name !== clan.name && !nameCheck.ok ? nameCheck.error : undefined}
            hint={`Up to ${CLAN_NAME_MAX} characters.`}
          >
            <Input
              id="clan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={CLAN_NAME_MAX}
            />
          </Field>
          <Field
            label="Tag"
            htmlFor="clan-tag"
            error={tag !== clan.tag && !tagCheck.ok ? tagCheck.error : undefined}
            hint={`Saved as ${normaliseClanTag(tag) || "…"}`}
          >
            <Input
              id="clan-tag"
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
    </ManageCard>
  );
}

// ── leaving and disbanding ───────────────────────────────────────────────

function DangerZone({
  clan,
  membership,
}: {
  clan: Clan;
  membership: ClanMembership;
}) {
  const router = useRouter();
  const { busy, status, run } = useClanAction();
  const [confirming, setConfirming] = useState<"leave" | "disband" | null>(null);

  if (!membership.can_leave && !membership.can_disband) return null;

  async function leave() {
    const done = await run(() => leaveClan(clan.id), `You left ${clan.name}.`);
    if (done) router.push("/clans");
  }

  async function disband() {
    const done = await run(() => disbandClan(clan.id), `${clan.name} was disbanded.`);
    if (done) router.push("/clans");
  }

  return (
    <ManageCard
      title={membership.is_member ? "Leaving" : "Server staff"}
      description={
        membership.is_member && !membership.can_leave
          ? "As owner you must hand the clan on, or disband it."
          : undefined
      }
      destructive
    >
      <div className="flex flex-wrap gap-2">
        {membership.can_leave ? (
          <Button variant="danger" disabled={busy} onClick={() => setConfirming("leave")}>
            Leave clan
          </Button>
        ) : null}
        {membership.can_disband ? (
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => setConfirming("disband")}
          >
            Disband clan
          </Button>
        ) : null}
      </div>

      {confirming ? (
        <div className="mt-3 rounded-md border border-coral/40 bg-coral/5 p-3">
          <p className="text-xs leading-relaxed text-dim">
            {confirming === "leave"
              ? `Leave ${clan.name}? You will lose the tag and need a new invite to come back.`
              : `Disband ${clan.name}? Every member loses the tag and outstanding invites are withdrawn. This cannot be undone.`}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={confirming === "leave" ? leave : disband}
            >
              {confirming === "leave" ? "Yes, leave" : "Yes, disband"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <StatusLine status={status} />
    </ManageCard>
  );
}
