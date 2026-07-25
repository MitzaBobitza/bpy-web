"use client";

import { useRouter } from "next/navigation";

import { ManageCard, StatusLine, useClanAction } from "@/components/clans/shell";
import { Button } from "@/components/ui/primitives";
import {
  acceptClanInvitation,
  declineClanInvitation,
} from "@/lib/bancho/clan-client";
import type { PendingClanInvite } from "@/lib/bancho/clan-types";
import { formatDate } from "@/lib/format";

/** Clan invites awaiting the signed-in player. */
export function InvitationsInbox({ invitations }: { invitations: PendingClanInvite[] }) {
  if (invitations.length === 0) return null;

  return (
    <ManageCard
      title={`Clan invites (${invitations.length})`}
      description="Accepting one turns down the rest."
    >
      <ul className="divide-y divide-line/60">
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} />
        ))}
      </ul>
    </ManageCard>
  );
}

function InvitationRow({ invitation }: { invitation: PendingClanInvite }) {
  const router = useRouter();
  const { busy, status, run } = useClanAction();

  async function accept() {
    const done = await run(
      () => acceptClanInvitation(invitation.id),
      `You joined ${invitation.clan.name}.`,
    );
    if (done) router.push(`/clans/${invitation.clan.id}`);
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-pink/15 text-xs font-black text-pink ring-1 ring-inset ring-pink/25">
          {invitation.clan.tag.slice(0, 4)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{invitation.clan.name}</p>
          <p className="text-xs text-faint">
            {invitation.invited_by ? `From ${invitation.invited_by}` : "Invited"} ·{" "}
            {formatDate(invitation.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={accept}>
            Accept
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                () => declineClanInvitation(invitation.id),
                `You turned down ${invitation.clan.name}.`,
              )
            }
          >
            Decline
          </Button>
        </div>
      </div>
      <StatusLine status={status} />
    </li>
  );
}
