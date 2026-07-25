import Link from "next/link";

import { AdminHeader } from "@/components/admin/shell";
import { SearchInput } from "@/components/search/SearchInput";
import { Pagination } from "@/components/ui/navigation";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getAdminClans } from "@/lib/bancho/admin";
import { formatDate, formatNumber } from "@/lib/format";

const PAGE_SIZE = 25;

export default async function AdminClansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const term = (q ?? "").trim();
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const listing = await getAdminClans({
    search: term || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Clans"
        title="Clans"
        description="Rename a clan whose name is a problem, hand one on when its owner is gone, or dissolve it. Member counts include restricted and unverified players."
      />

      <SearchInput
        initialTerm={term}
        basePath="/admin/clans"
        placeholder="Clan name or tag"
      />

      <Panel>
        <PanelHeader
          title={
            term
              ? `${formatNumber(listing.total)} matching “${term}”`
              : `${formatNumber(listing.total)} ${listing.total === 1 ? "clan" : "clans"}`
          }
        />
        {listing.items.length === 0 ? (
          <EmptyState
            title={term ? `Nothing matches “${term}”` : "No clans yet"}
            description={term ? "Try the tag instead of the name." : undefined}
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {listing.items.map((clan) => (
              <li key={clan.id}>
                <Link
                  href={`/admin/clans/${clan.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2"
                >
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-pink/15 text-sm font-black text-pink ring-1 ring-inset ring-pink/25">
                    {clan.tag.slice(0, 4)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate-flex font-bold text-ink">{clan.name}</p>
                    <p className="text-xs text-faint">
                      [{clan.tag}] · {clan.owner_name ?? `owner #${clan.owner_id}`} ·
                      founded {formatDate(clan.created_at)}
                    </p>
                  </div>
                  <span className="flex-none text-right">
                    <span className="font-mono text-sm font-extrabold text-ink">
                      {formatNumber(clan.member_count)}
                    </span>
                    <span className="ml-1 text-xs text-faint">
                      {clan.member_count === 1 ? "member" : "members"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(next) => {
          const params = new URLSearchParams();
          if (term) params.set("q", term);
          if (next > 1) params.set("page", String(next));
          const query = params.toString();
          return query ? `/admin/clans?${query}` : "/admin/clans";
        }}
      />
    </div>
  );
}
