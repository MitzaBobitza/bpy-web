import Link from "next/link";

import { AdminHeader, StateChip } from "@/components/admin/shell";
import { Avatar } from "@/components/osu/Avatar";
import { CountryFlag } from "@/components/osu/badges";
import { SearchInput } from "@/components/search/SearchInput";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getPlayerAdminView } from "@/lib/bancho/admin";
import { searchPlayers } from "@/lib/bancho/api";
import { formatRelative } from "@/lib/format";
import { privilegeLabels } from "@/lib/osu/privileges";

/** How many matches are resolved to their admin view at once. */
const MAX_RESULTS = 20;

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const tooShort = term.length > 0 && term.length < 2;

  // staff see restricted and unverified players in search results, which is
  // exactly who they usually need to find
  const matches = term.length >= 2 ? await searchPlayers(term) : [];
  const players = await Promise.all(
    matches.slice(0, MAX_RESULTS).map((match) => getPlayerAdminView(match.id)),
  );
  const found = players.filter((player) => player !== null);

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Players"
        title="Find a player"
        description="Search by username. Restricted and unverified accounts are included."
      />

      <SearchInput initialTerm={term} basePath="/admin/players" placeholder="Username to look up" />

      {term.length === 0 ? (
        <Panel>
          <EmptyState
            title="Search for someone to begin"
            description="Two characters minimum. You can also reach this page from any profile."
          />
        </Panel>
      ) : tooShort ? (
        <Panel>
          <EmptyState title="Keep typing" description="Search needs at least two characters." />
        </Panel>
      ) : (
        <Panel>
          <PanelHeader
            title={`${found.length} ${found.length === 1 ? "match" : "matches"}`}
          />
          {found.length === 0 ? (
            <EmptyState title={`Nothing matches “${term}”`} />
          ) : (
            <ul className="divide-y divide-line/60">
              {found.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/admin/players/${player.id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <Avatar playerId={player.id} name={player.name} size={36} />
                    <CountryFlag country={player.country} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate-flex font-bold text-ink">{player.name}</p>
                      <p className="text-xs text-faint">
                        {privilegeLabels(player.priv).join(", ") || "No privileges"} · last
                        seen {formatRelative(player.latest_activity)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {player.is_online ? <StateChip label="Online" tone="good" /> : null}
                      {player.restricted ? (
                        <StateChip label="Restricted" tone="bad" />
                      ) : null}
                      {player.silenced ? <StateChip label="Silenced" tone="warn" /> : null}
                      {player.is_donor ? <StateChip label="Donator" tone="neutral" /> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
