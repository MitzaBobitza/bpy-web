import type { Metadata } from "next";
import Link from "next/link";

import { DifficultyPill } from "@/components/osu/badges";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getMappools } from "@/lib/bancho/api";
import type { Mappool, MappoolMap } from "@/lib/bancho/types";
import { formatDate, formatDuration } from "@/lib/format";
import { modeInfo } from "@/lib/osu/gamemodes";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Tournaments",
  description: "Tournament mappools published on the server.",
  path: "/tournaments",
});

export default async function TournamentsPage() {
  // bancho.py resolves a pool's creator from its in-memory session list, so
  // pools are only readable while their creator is online. Nothing here can
  // work around that; the empty state explains it instead.
  const pools = await getMappools();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <p className="eyebrow">Competitive</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Tournament mappools</h1>
        <p className="mt-1.5 text-sm text-dim">
          {pools.length === 0
            ? "No mappools are readable right now."
            : `${pools.length} ${pools.length === 1 ? "pool" : "pools"}. Pools are built in game with the !pool command and can be loaded into a match by referees.`}
        </p>
      </header>

      {pools.length === 0 ? (
        <Panel className="mt-6">
          <EmptyState
            title="No mappools to show"
            description="Tournament staff create pools in game with !pool create, then add maps to slots such as NM1 or HD2. A pool is only readable here while the player who created it is connected to the game server."
          />
        </Panel>
      ) : (
        <div className="mt-6 space-y-5">
          {pools.map((pool) => (
            <MappoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Slot keys arrive as a mod string joined to a number, e.g. "NM1" or
 * "HD2" — the same labels tournaments use. Sort them by bracket, then by
 * slot number, so the pool reads in its intended order.
 */
const BRACKET_ORDER = ["NM", "HD", "HR", "DT", "FM", "TB", "EZ", "FL"];

function sortSlots(entries: [string, MappoolMap][]): [string, MappoolMap][] {
  return [...entries].sort(([a], [b]) => {
    const bracketA = a.replace(/\d+$/, "");
    const bracketB = b.replace(/\d+$/, "");
    const indexA = BRACKET_ORDER.indexOf(bracketA);
    const indexB = BRACKET_ORDER.indexOf(bracketB);
    const rankA = indexA === -1 ? BRACKET_ORDER.length : indexA;
    const rankB = indexB === -1 ? BRACKET_ORDER.length : indexB;
    if (rankA !== rankB) return rankA - rankB;
    if (bracketA !== bracketB) return bracketA.localeCompare(bracketB);
    return Number.parseInt(a.slice(bracketA.length), 10) - Number.parseInt(b.slice(bracketB.length), 10);
  });
}

function MappoolCard({ pool }: { pool: Mappool }) {
  const slots = sortSlots(Object.entries(pool.maps));

  return (
    <Panel>
      <PanelHeader
        title={pool.name}
        action={
          <span className="text-xs text-faint">
            {slots.length} {slots.length === 1 ? "map" : "maps"}
          </span>
        }
      />
      <div className="border-b border-line px-4 py-2.5 text-xs text-faint">
        Created {formatDate(pool.created_at)} by{" "}
        <Link
          href={`/u/${pool.created_by.id}`}
          className="font-bold text-dim transition hover:text-pink"
        >
          {pool.created_by.name}
        </Link>
        {pool.created_by.clan ? ` · [${pool.created_by.clan.tag}]` : ""}
      </div>

      {slots.length === 0 ? (
        <EmptyState title="This pool has no maps yet" />
      ) : (
        <ul className="divide-y divide-line/60">
          {slots.map(([slot, map]) => (
            <li key={slot} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-12 flex-none font-mono text-xs font-extrabold uppercase text-pink">
                {slot}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/beatmaps/${map.id}`}
                    className="truncate-flex text-sm font-bold text-ink transition hover:text-pink"
                  >
                    {map.artist} - {map.title}
                  </Link>
                  <DifficultyPill stars={map.diff} />
                </div>
                <p className="truncate-flex text-xs text-faint">
                  [{map.version}] · {modeInfo(map.mode).shortName} · {Math.round(map.bpm)} BPM ·{" "}
                  {formatDuration(map.total_length)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
