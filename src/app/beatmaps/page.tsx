import type { Metadata } from "next";
import Link from "next/link";

import { BeatmapCover } from "@/components/osu/BeatmapCover";
import { DifficultyPill, StatusBadge } from "@/components/osu/badges";
import { BeatmapFilters } from "@/components/beatmaps/BeatmapFilters";
import { Pagination, PillLinks } from "@/components/ui/navigation";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { getMaps } from "@/lib/bancho/api";
import type { BeatmapRecord } from "@/lib/bancho/types";
import { beatmapDownloadUrl } from "@/lib/config";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import { RANKED_STATUS } from "@/lib/osu/beatmaps";
import { MODE_LIST, modeInfo } from "@/lib/osu/gamemodes";

export const metadata: Metadata = {
  title: "Beatmaps",
  description: "Browse every beatmap tracked by the server, with leaderboards for each.",
};

const PAGE_SIZE = 24;

/** Statuses worth offering as a filter, in the order osu! lists them. */
const STATUS_FILTERS = [2, 3, 4, 5, 0];

export default async function BeatmapsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    mode?: string;
    artist?: string;
    creator?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const status = params.status !== undefined ? Number.parseInt(params.status, 10) : undefined;
  const mode = params.mode !== undefined ? Number.parseInt(params.mode, 10) : undefined;
  const artist = params.artist?.trim() || undefined;
  const creator = params.creator?.trim() || undefined;

  const listing = await getMaps({
    status: Number.isFinite(status) ? status : undefined,
    mode: Number.isFinite(mode) ? mode : undefined,
    artist,
    creator,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const merged: Record<string, string | number | undefined> = {
      status: params.status,
      mode: params.mode,
      artist,
      creator,
      page,
      ...overrides,
    };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "" || (key === "page" && Number(value) <= 1)) continue;
      search.set(key, String(value));
    }
    const encoded = search.toString();
    return `/beatmaps${encoded ? `?${encoded}` : ""}`;
  };

  const totalPages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header>
        <p className="eyebrow">Beatmaps</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Beatmap listing
        </h1>
        <p className="mt-1.5 text-sm text-dim">
          {formatNumber(listing.total)} {listing.total === 1 ? "difficulty" : "difficulties"} tracked
          by the server. Every one has its own leaderboard.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-16 flex-none text-[11px] font-bold uppercase tracking-wider text-faint">
            Status
          </span>
          <PillLinks
            items={[
              { href: buildHref({ status: undefined, page: 1 }), label: "Any", active: status === undefined || Number.isNaN(status) },
              ...STATUS_FILTERS.map((value) => ({
                href: buildHref({ status: value, page: 1 }),
                label: RANKED_STATUS[value],
                active: status === value,
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-16 flex-none text-[11px] font-bold uppercase tracking-wider text-faint">
            Mode
          </span>
          <PillLinks
            items={[
              { href: buildHref({ mode: undefined, page: 1 }), label: "Any", active: mode === undefined || Number.isNaN(mode) },
              // maps store only the vanilla ruleset they were made for
              ...MODE_LIST.filter((entry) => entry.group === "vanilla").map((entry) => ({
                href: buildHref({ mode: entry.id, page: 1 }),
                label: entry.shortName,
                active: mode === entry.id,
                title: entry.fullName,
              })),
            ]}
          />
        </div>
        <BeatmapFilters artist={artist ?? ""} creator={creator ?? ""} />
      </div>

      {listing.items.length === 0 ? (
        <Panel className="mt-6">
          <EmptyState
            title="No beatmaps match these filters"
            description="bancho.py adds beatmaps to its database the first time a player requests one in the game, so a new server starts out empty."
          />
        </Panel>
      ) : (
        <ul className="mt-6 grid gap-3 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
          {listing.items.map((map) => (
            <BeatmapCard key={map.id} map={map} />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={(next) => buildHref({ page: next })} />
    </div>
  );
}

function BeatmapCard({ map }: { map: BeatmapRecord }) {
  return (
    <li className="group">
      <div className="panel overflow-hidden transition hover:border-line-bright">
        <Link href={`/beatmaps/${map.id}`} className="block">
          <BeatmapCover setId={map.set_id} size="card" className="h-28" scrim="heavy">
            <div className="flex h-28 flex-col justify-end p-3">
              <div className="flex items-center gap-2">
                <DifficultyPill stars={map.diff} />
                <StatusBadge status={map.status} />
              </div>
              <h2 className="mt-1.5 truncate-flex font-extrabold leading-tight text-ink group-hover:text-pink">
                {map.title}
              </h2>
              <p className="truncate-flex text-xs text-dim">{map.artist}</p>
            </div>
          </BeatmapCover>
        </Link>

        <div className="space-y-2 px-3 py-2.5">
          <p className="truncate-flex text-xs text-faint">
            <span className="font-bold text-dim">[{map.version}]</span> · mapped by {map.creator}
          </p>
          <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
            <div className="flex gap-1">
              <dt className="sr-only">Length</dt>
              <dd className="font-mono">{formatDuration(map.total_length)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>BPM</dt>
              <dd className="font-mono text-dim">{Math.round(map.bpm)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Mode</dt>
              <dd className="text-dim">{modeInfo(map.mode).shortName}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Plays</dt>
              <dd className="font-mono text-dim">{formatNumber(map.plays)}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-faint">
              Updated {formatRelative(map.last_update)}
            </span>
            <a
              href={beatmapDownloadUrl(map.set_id)}
              className="text-[11px] font-bold text-pink transition hover:text-pink-hi"
              rel="noreferrer noopener"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}
