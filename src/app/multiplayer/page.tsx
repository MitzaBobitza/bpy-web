import type { Metadata } from "next";
import Link from "next/link";

import { ModList } from "@/components/osu/badges";
import { Chip, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getActiveMatches } from "@/lib/bancho/api";
import type { Match, MatchSlot } from "@/lib/bancho/types";
import { modeInfo } from "@/lib/osu/gamemodes";

export const metadata: Metadata = {
  title: "Multiplayer",
  description: "Multiplayer matches running on the server right now.",
};

/** Matches live in memory only, so this page is always freshly fetched. */
export const dynamic = "force-dynamic";

/** Slot states from bancho.py's `SlotStatus`. */
const SLOT_STATUS: Record<number, string> = {
  1: "Open",
  2: "Locked",
  4: "Not ready",
  8: "Ready",
  16: "No map",
  32: "Playing",
  64: "Complete",
  128: "Quit",
};

/** Team colours, when a match is in a team mode. */
const TEAMS: Record<number, { label: string; className: string } | null> = {
  0: null,
  1: { label: "Blue", className: "bg-sky/15 text-sky" },
  2: { label: "Red", className: "bg-coral/15 text-coral" },
};

export default async function MultiplayerPage() {
  const matches = await getActiveMatches();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <p className="eyebrow">Live</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Multiplayer</h1>
        <p className="mt-1.5 text-sm text-dim">
          {matches.length === 0
            ? "No matches are running at the moment."
            : `${matches.length} ${matches.length === 1 ? "match" : "matches"} in progress. Lobbies exist only while they are open, so this list is live.`}
        </p>
      </header>

      {matches.length === 0 ? (
        <Panel className="mt-6">
          <EmptyState
            title="No open lobbies"
            description="Create a match from the osu! client's multiplayer menu and it will show up here."
          />
        </Panel>
      ) : (
        <ul className="mt-6 space-y-4">
          {matches.map(({ id, match }) => (
            <MatchCard key={id} id={id} match={match} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchCard({ id, match }: { id: number; match: Match }) {
  const slots = Object.entries(match.active_slots);

  return (
    <li>
      <Panel>
        <PanelHeader
          title={`Match ${id}`}
          action={
            <div className="flex items-center gap-2">
              {match.in_progress ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-mint animate-live"
                    aria-hidden="true"
                  />
                  Playing
                </span>
              ) : (
                <Chip>Waiting</Chip>
              )}
              {match.is_scrimming ? <Chip className="bg-violet/15 text-violet">Scrim</Chip> : null}
            </div>
          }
        />

        <div className="space-y-3 px-4 py-4">
          <div>
            <h2 className="text-lg font-extrabold leading-tight text-ink">{match.name}</h2>
            <p className="mt-0.5 text-xs text-faint">
              Hosted by{" "}
              <Link
                href={`/u/${match.host.id}`}
                className="font-bold text-dim transition hover:text-pink"
              >
                {match.host.name}
              </Link>
              {" · "}
              {modeInfo(match.mode).fullName}
            </p>
          </div>

          <div className="panel-inset flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Beatmap</p>
              {match.map.id && match.map.name ? (
                <Link
                  href={`/beatmaps/${match.map.id}`}
                  className="truncate-flex block text-sm font-bold text-ink transition hover:text-pink"
                >
                  {match.map.name}
                </Link>
              ) : (
                <p className="text-sm text-faint">{match.map.name ?? "No beatmap selected"}</p>
              )}
            </div>
            <ModList mods={match.mods} size="sm" />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">
              Players · {slots.length}
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {slots.map(([index, slot]) => (
                <SlotRow key={index} slot={slot} />
              ))}
            </ul>
          </div>

          {match.refs.length > 0 ? (
            <p className="text-xs text-faint">
              Referees:{" "}
              {match.refs.map((ref, position) => (
                <span key={ref.id}>
                  {position > 0 ? ", " : ""}
                  <Link href={`/u/${ref.id}`} className="font-bold text-dim hover:text-pink">
                    {ref.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </Panel>
    </li>
  );
}

function SlotRow({ slot }: { slot: MatchSlot }) {
  const team = TEAMS[slot.team] ?? null;

  return (
    <li className="flex items-center gap-2 rounded border border-line bg-void px-2.5 py-1.5">
      <Link
        href={`/u/${slot.player.id}`}
        className="truncate-flex flex-1 text-sm font-bold text-ink transition hover:text-pink"
      >
        {slot.player.name}
      </Link>
      {team ? (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${team.className}`}>
          {team.label}
        </span>
      ) : null}
      <ModList mods={slot.mods} size="sm" />
      <span className="flex-none text-[11px] font-bold text-faint">
        {SLOT_STATUS[slot.status] ?? "In lobby"}
      </span>
    </li>
  );
}
