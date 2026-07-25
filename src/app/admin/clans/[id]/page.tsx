import Link from "next/link";
import { notFound } from "next/navigation";

import { ClanActions } from "@/components/admin/ClanActions";
import { AdminHeader, AuditLogList, StateChip } from "@/components/admin/shell";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import {
  getAdminCapabilities,
  getAdminClan,
  getAdminClanMembers,
  getAuditLog,
} from "@/lib/bancho/admin";
import { formatDate, formatNumber } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export default async function AdminClanPage({ params }: Props) {
  const { id } = await params;
  const clanId = Number.parseInt(id, 10);
  if (!Number.isFinite(clanId)) notFound();

  const clan = await getAdminClan(clanId);
  if (!clan) notFound();

  const [members, capabilities] = await Promise.all([
    getAdminClanMembers(clanId),
    getAdminCapabilities(),
  ]);

  // what has already been done to this clan, read off the owner's record
  const history = capabilities?.view_audit_log
    ? await getAuditLog({ subjectId: clan.owner_id, pageSize: 10 })
    : null;
  const clanHistory =
    history?.items.filter((entry) => entry.action.startsWith("clan_")) ?? [];

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Clans"
        title={clan.name}
        description={`[${clan.tag}] · founded ${formatDate(clan.created_at)}`}
      />

      <Panel className="flex flex-wrap items-center gap-3 p-4">
        <StateChip label={`${formatNumber(clan.member_count)} members`} />
        <StateChip label={`Owned by ${clan.owner_name ?? `#${clan.owner_id}`}`} />
        <Link
          href={`/clans/${clan.id}`}
          className="ml-auto text-xs font-bold text-pink transition hover:text-pink-hi"
        >
          View public page →
        </Link>
      </Panel>

      <ClanActions clan={clan} members={members} />

      {clanHistory.length > 0 ? (
        <Panel>
          <PanelHeader title="Earlier staff actions on this clan" />
          <AuditLogList entries={clanHistory} />
        </Panel>
      ) : null}
    </div>
  );
}
