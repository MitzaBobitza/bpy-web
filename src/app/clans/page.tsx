import type { Metadata } from "next";
import Link from "next/link";

import { CreateClanForm } from "@/components/clans/CreateClanForm";
import { InvitationsInbox } from "@/components/clans/InvitationsInbox";
import { Pagination } from "@/components/ui/navigation";
import { ButtonLink, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getClans } from "@/lib/bancho/api";
import { getClanRoster, getMyClanInvitations } from "@/lib/bancho/clans";
import { getCurrentPlayer } from "@/lib/bancho/session";
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

  const [listing, viewer, invitations] = await Promise.all([
    getClans(page, PAGE_SIZE),
    getCurrentPlayer(),
    getMyClanInvitations(),
  ]);

  // the clan model carries no member count, so each roster is read alongside
  const clans = await Promise.all(
    listing.items.map(async (clan) => ({
      clan,
      members: await getClanRoster(clan.id),
    })),
  );

  const totalPages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));
  const ownClanId = viewer?.clan_id || null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <p className="eyebrow">Community</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Clans</h1>
        <p className="mt-1.5 text-sm text-dim">
          {formatNumber(listing.total)} {listing.total === 1 ? "clan" : "clans"}. Play
          under a shared tag — run yours from here or in game with{" "}
          <code className="font-mono text-dim">!clan</code>.
        </p>
      </header>

      {ownClanId ? (
        <div className="mt-5">
          <ButtonLink href={`/clans/${ownClanId}`} variant="secondary">
            Go to your clan
          </ButtonLink>
        </div>
      ) : null}

      {invitations.length > 0 ? (
        <div className="mt-5">
          <InvitationsInbox invitations={invitations} />
        </div>
      ) : null}

      {viewer && !ownClanId ? (
        <div className="mt-5">
          <CreateClanForm />
        </div>
      ) : null}

      <Panel className="mt-6">
        <PanelHeader title="All clans" />
        {clans.length === 0 ? (
          <EmptyState
            title="No clans yet"
            description="Anyone can start one — sign in and found the first."
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
