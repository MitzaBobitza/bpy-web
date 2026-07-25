import type { Metadata } from "next";
import Link from "next/link";

import { Pagination } from "@/components/ui/navigation";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getClanWithMembers, getClans } from "@/lib/bancho/api";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Clans",
  description: "Every clan on the server and who plays for them.",
};

const PAGE_SIZE = 30;

export default async function ClansPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const listing = await getClans(page, PAGE_SIZE);

  // the v2 clan model carries no member count, so membership comes from the
  // v1 endpoint — the only one that exposes it
  const clans = await Promise.all(
    listing.items.map(async (clan) => ({
      clan,
      members: (await getClanWithMembers(clan.id))?.members ?? [],
    })),
  );

  const totalPages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <p className="eyebrow">Community</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Clans</h1>
        <p className="mt-1.5 text-sm text-dim">
          {formatNumber(listing.total)} {listing.total === 1 ? "clan" : "clans"}. Clans are created
          and managed in game with the <code className="font-mono text-dim">!clan</code> command.
        </p>
      </header>

      <Panel className="mt-6">
        <PanelHeader title="All clans" />
        {clans.length === 0 ? (
          <EmptyState
            title="No clans yet"
            description="Anyone can start one in game with !clan create."
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {clans.map(({ clan, members }) => (
              <li key={clan.id}>
                <Link
                  href={`/clans/${clan.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2"
                >
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-pink/15 font-black text-pink ring-1 ring-inset ring-pink/25">
                    {clan.tag.slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate-flex font-bold text-ink">{clan.name}</p>
                    <p className="text-xs text-faint">
                      [{clan.tag}] · founded {formatDate(clan.created_at)}
                    </p>
                  </div>
                  <span className="flex-none text-right">
                    <span className="font-mono text-sm font-extrabold text-ink">
                      {formatNumber(members.length)}
                    </span>
                    <span className="ml-1 text-xs text-faint">
                      {members.length === 1 ? "member" : "members"}
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
        buildHref={(next) => (next > 1 ? `/clans?page=${next}` : "/clans")}
      />
    </div>
  );
}
