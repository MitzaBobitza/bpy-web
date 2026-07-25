import { AdminHeader, AuditLogList } from "@/components/admin/shell";
import { SimplePager } from "@/components/ui/navigation";
import { PillLinks } from "@/components/ui/navigation";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { getAuditLog } from "@/lib/bancho/admin";
import { formatNumber } from "@/lib/format";
import { AUDIT_ACTIONS } from "@/lib/osu/admin";

const PAGE_SIZE = 40;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; days?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const action = params.action && params.action in AUDIT_ACTIONS ? params.action : undefined;
  const days = params.days ? Number.parseInt(params.days, 10) : undefined;

  const log = await getAuditLog({
    action,
    days: Number.isFinite(days) ? days : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const merged: Record<string, string | number | undefined> = {
      action,
      days: params.days,
      page,
      ...overrides,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "" || (key === "page" && Number(value) <= 1)) continue;
      search.set(key, String(value));
    }
    const encoded = search.toString();
    return `/admin/audit${encoded ? `?${encoded}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Audit log"
        title="Staff activity"
        description="Every moderation action taken on the server, newest first. Actions taken with in-game commands appear here too."
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-14 flex-none text-[11px] font-bold uppercase tracking-wider text-faint">
            Action
          </span>
          <PillLinks
            items={[
              { href: buildHref({ action: undefined, page: 1 }), label: "All", active: !action },
              ...Object.entries(AUDIT_ACTIONS).map(([key, meta]) => ({
                href: buildHref({ action: key, page: 1 }),
                label: meta.label,
                active: action === key,
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-14 flex-none text-[11px] font-bold uppercase tracking-wider text-faint">
            Period
          </span>
          <PillLinks
            items={[
              { href: buildHref({ days: undefined, page: 1 }), label: "All time", active: !params.days },
              ...[1, 7, 30, 365].map((value) => ({
                href: buildHref({ days: value, page: 1 }),
                label: value === 1 ? "Last day" : value === 365 ? "Last year" : `Last ${value} days`,
                active: params.days === String(value),
              })),
            ]}
          />
        </div>
      </div>

      <Panel>
        <PanelHeader title={`${formatNumber(log.total)} entries`} />
        <AuditLogList entries={log.items} />
      </Panel>

      <SimplePager
        page={page}
        hasNext={log.items.length === PAGE_SIZE}
        buildHref={(next) => buildHref({ page: next })}
      />
    </div>
  );
}
