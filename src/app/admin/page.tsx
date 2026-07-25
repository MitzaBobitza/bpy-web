import Link from "next/link";

import { AdminHeader, AuditLogList, StateChip } from "@/components/admin/shell";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { getAdminCapabilities, getAuditLog, getMapRequests } from "@/lib/bancho/admin";
import { getScores, getServerStats } from "@/lib/bancho/api";
import { getCurrentPlayer } from "@/lib/bancho/session";
import { formatCompact, formatNumber } from "@/lib/format";
import { allowedSections } from "@/lib/osu/admin";
import { privilegeLabels } from "@/lib/osu/privileges";

export default async function AdminOverviewPage() {
  const [player, capabilities, stats, scoreCount] = await Promise.all([
    getCurrentPlayer(),
    getAdminCapabilities(),
    getServerStats(),
    getScores({ pageSize: 1 }),
  ]);

  // the layout already guaranteed both of these
  if (!player || !capabilities) return null;

  const [recentAudit, mapRequests] = await Promise.all([
    capabilities.view_audit_log
      ? getAuditLog({ pageSize: 8 })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
    capabilities.view_nomination_queue ? getMapRequests() : Promise.resolve([]),
  ]);

  const sections = allowedSections(capabilities);

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Staff area"
        title={`Welcome, ${player.name}`}
        description="Everything you do here is recorded in the audit log under your name."
      />

      <section>
        <h2 className="eyebrow">Your privileges</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {privilegeLabels(player.priv).map((label) => (
            <StateChip key={label} label={label} tone="neutral" />
          ))}
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Online now" value={formatNumber(stats?.online_players ?? 0)} />
        <Metric label="Registered" value={formatNumber(stats?.total_players ?? 0)} />
        <Metric label="Scores" value={formatCompact(scoreCount.total)} />
        <Metric
          label="Nominations queued"
          value={capabilities.view_nomination_queue ? formatNumber(mapRequests.length) : "–"}
        />
      </dl>

      <section>
        <h2 className="eyebrow">What you can do</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="panel block h-full p-4 transition hover:border-violet/40"
              >
                <p className="text-sm font-extrabold text-ink">{section.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-faint">
                  {section.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {capabilities.view_audit_log ? (
        <Panel>
          <PanelHeader
            title="Recent staff activity"
            action={
              <Link
                href="/admin/audit"
                className="text-xs font-bold text-violet transition hover:text-violet/80"
              >
                Full log →
              </Link>
            }
          />
          <AuditLogList entries={recentAudit.items} />
        </Panel>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-extrabold text-ink">{value}</dd>
    </div>
  );
}
