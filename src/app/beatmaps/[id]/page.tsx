import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BeatmapCover } from "@/components/osu/BeatmapCover";
import { DifficultyPill, StatusBadge } from "@/components/osu/badges";
import { MapScoreRow } from "@/components/osu/ScoreRow";
import { FavouriteButton } from "@/components/beatmaps/FavouriteButton";
import { PillLinks, TabLinks } from "@/components/ui/navigation";
import { ButtonLink, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getFavourites, getMap, getMapRating, getMapScores, getMaps } from "@/lib/bancho/api";
import { getCurrentPlayer } from "@/lib/bancho/session";
import type { BeatmapRecord } from "@/lib/bancho/types";
import { beatmapDownloadUrl } from "@/lib/config";
import { formatDate, formatDuration, formatNumber, formatStars } from "@/lib/format";
import { difficultyColor, difficultyTier, isScoreable, statusLabel } from "@/lib/osu/beatmaps";
import { MODE_LIST, modeInfo, toMode, vanillaMode } from "@/lib/osu/gamemodes";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; scope?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const map = await getMap(Number.parseInt(id, 10));
  if (!map) return { title: "Beatmap not found" };
  return {
    title: `${map.artist} - ${map.title} [${map.version}]`,
    description: `Leaderboard for ${map.artist} - ${map.title} [${map.version}], mapped by ${map.creator}.`,
  };
}

export default async function BeatmapPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { mode: modeParam, scope: scopeParam } = await searchParams;

  const mapId = Number.parseInt(id, 10);
  if (!Number.isFinite(mapId)) notFound();

  const map = await getMap(mapId);
  if (!map) notFound();

  // a map is only playable under its own ruleset, so default there
  const mode = toMode(modeParam ?? map.mode);
  const scope = scopeParam === "recent" ? "recent" : "best";

  const [scores, rating, siblings, viewer] = await Promise.all([
    getMapScores(mapId, { scope, mode, limit: 50 }),
    getMapRating(mapId),
    getMaps({ setId: map.set_id, pageSize: 100 }),
    getCurrentPlayer(),
  ]);

  const favourites = viewer ? await getFavourites(viewer.id) : [];

  // relax and autopilot only exist for the rulesets that support them
  const availableModes = MODE_LIST.filter((entry) => entry.ruleset === modeInfo(map.mode).ruleset);
  const difficulties = [...siblings.items].sort((a, b) => a.diff - b.diff);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <BeatmapHeader
        map={map}
        rating={rating}
        isFavourite={favourites.includes(map.set_id)}
        viewerId={viewer?.id ?? null}
      />

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 lg:grid-cols-[19rem_1fr]">
        <div className="space-y-5">
          <DifficultyPanel map={map} />
          {difficulties.length > 1 ? (
            <DifficultiesPanel current={map.id} difficulties={difficulties} />
          ) : null}
        </div>

        <Panel className="overflow-hidden">
          <PanelHeader
            title={`${scope === "best" ? "Leaderboard" : "Recent scores"} · ${modeInfo(mode).fullName}`}
            action={
              <TabLinks
                tabs={[
                  {
                    href: `/beatmaps/${map.id}?mode=${mode}`,
                    label: "Top",
                    active: scope === "best",
                  },
                  {
                    href: `/beatmaps/${map.id}?mode=${mode}&scope=recent`,
                    label: "Recent",
                    active: scope === "recent",
                  },
                ]}
              />
            }
          />

          {availableModes.length > 1 ? (
            <div className="border-b border-line px-4 py-2.5">
              <PillLinks
                items={availableModes.map((entry) => ({
                  href: `/beatmaps/${map.id}?mode=${entry.id}${scope === "recent" ? "&scope=recent" : ""}`,
                  label: entry.shortName,
                  active: entry.id === mode,
                  title: entry.fullName,
                }))}
              />
            </div>
          ) : null}

          {scores.length === 0 ? (
            <EmptyState
              title="No scores yet"
              description={
                isScoreable(map.status)
                  ? "Be the first to set a score on this difficulty."
                  : `This beatmap is ${statusLabel(map.status).toLowerCase()}, so scores on it do not award pp.`
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
                    <th scope="col" className="px-3 py-2 text-center font-bold">
                      #
                    </th>
                    <th scope="col" className="px-1 py-2 text-left font-bold">
                      Grade
                    </th>
                    <th scope="col" className="px-2 py-2 text-left font-bold">
                      Player
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-bold">
                      Score
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-bold">
                      Accuracy
                    </th>
                    <th scope="col" className="hidden px-2 py-2 text-right font-bold sm:table-cell">
                      Combo
                    </th>
                    <th scope="col" className="hidden px-2 py-2 text-right font-bold md:table-cell">
                      Hits
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-bold">
                      Mods
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-bold">
                      pp
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-bold">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => (
                    <MapScoreRow
                      key={score.id}
                      score={score}
                      rank={index + 1}
                      vanillaMode={vanillaMode(mode)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ── header ────────────────────────────────────────────────────────────── */

function BeatmapHeader({
  map,
  rating,
  isFavourite,
  viewerId,
}: {
  map: BeatmapRecord;
  rating: Awaited<ReturnType<typeof getMapRating>>;
  isFavourite: boolean;
  viewerId: number | null;
}) {
  return (
    <header className="overflow-hidden rounded-panel border border-line">
      <BeatmapCover setId={map.set_id} size="cover" className="min-h-44" scrim="heavy">
        <div className="flex min-h-44 flex-col justify-end gap-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={map.status} />
            <DifficultyPill stars={map.diff} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-dim">
              {difficultyTier(map.diff)}
            </span>
            <span className="text-[11px] text-faint">{modeInfo(map.mode).fullName}</span>
          </div>

          <div>
            <h1 className="text-2xl font-black leading-tight tracking-tight text-ink text-shadow-hero sm:text-3xl">
              {map.title}
            </h1>
            <p className="mt-0.5 text-base font-bold text-dim">{map.artist}</p>
            <p className="mt-1 text-sm text-faint">
              [{map.version}] · mapped by{" "}
              <Link
                href={`/beatmaps?creator=${encodeURIComponent(map.creator)}`}
                className="font-bold text-dim transition hover:text-pink"
              >
                {map.creator}
              </Link>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={beatmapDownloadUrl(map.set_id)} size="sm">
              Download beatmap
            </ButtonLink>
            <a
              href={`osu://dl/${map.set_id}`}
              className="inline-flex h-8 items-center rounded-md border border-line-bright bg-surface-3/80 px-3 text-xs font-bold text-ink transition hover:bg-line-bright"
              title="Open directly in osu!direct"
            >
              osu!direct
            </a>
            {viewerId ? (
              <FavouriteButton
                viewerId={viewerId}
                setId={map.set_id}
                initiallyFavourite={isFavourite}
              />
            ) : null}
            {rating && rating.count > 0 ? (
              <span
                className="text-xs text-faint"
                title={`Rated by ${formatNumber(rating.count)} ${rating.count === 1 ? "player" : "players"}`}
              >
                Rated{" "}
                <strong className="font-mono font-extrabold text-dim">
                  {rating.average?.toFixed(1)}
                </strong>
                /10
              </span>
            ) : null}
          </div>
        </div>
      </BeatmapCover>
    </header>
  );
}

/* ── difficulty stats ──────────────────────────────────────────────────── */

function DifficultyPanel({ map }: { map: BeatmapRecord }) {
  /**
   * Circle size, approach rate, accuracy and drain are all on a 0-10 scale
   * (mania keys aside), so they read as comparable meters.
   */
  const meters: { label: string; value: number; max: number }[] = [
    { label: vanillaMode(map.mode) === 3 ? "Key count" : "Circle size", value: map.cs, max: 10 },
    { label: "HP drain", value: map.hp, max: 10 },
    { label: "Accuracy", value: map.od, max: 10 },
    { label: "Approach rate", value: map.ar, max: 10 },
  ];

  const facts: [string, string][] = [
    ["Length", formatDuration(map.total_length)],
    ["BPM", String(Math.round(map.bpm))],
    ["Max combo", `${formatNumber(map.max_combo)}x`],
    ["Plays", formatNumber(map.plays)],
    ["Passes", formatNumber(map.passes)],
    ["Last updated", formatDate(map.last_update)],
  ];

  const passRate = map.plays > 0 ? (map.passes / map.plays) * 100 : null;

  return (
    <Panel>
      <PanelHeader title="Difficulty" />
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-baseline gap-2">
          <span
            className="font-mono text-2xl font-black"
            style={{ color: difficultyColor(map.diff) }}
          >
            {formatStars(map.diff)}
          </span>
          <span className="text-sm text-faint">stars</span>
        </div>

        {/* mania stores its key count in cs, where a 0-10 meter is misleading */}
        <dl className="space-y-2">
          {meters.map((meter) => (
            <div key={meter.label}>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-faint">{meter.label}</dt>
                <dd className="font-mono text-xs font-bold text-dim">{meter.value.toFixed(1)}</dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-void">
                <div
                  className="h-full rounded-full bg-pink-lo"
                  style={{ width: `${Math.min(100, (meter.value / meter.max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </div>

      <dl className="divide-y divide-line/60 border-t border-line">
        {facts.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-faint">{label}</dt>
            <dd className="font-mono text-sm font-bold text-ink">{value}</dd>
          </div>
        ))}
        {passRate !== null ? (
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-faint">Pass rate</dt>
            <dd className="font-mono text-sm font-bold text-ink">{passRate.toFixed(1)}%</dd>
          </div>
        ) : null}
      </dl>
    </Panel>
  );
}

function DifficultiesPanel({
  current,
  difficulties,
}: {
  current: number;
  difficulties: BeatmapRecord[];
}) {
  return (
    <Panel>
      <PanelHeader title={`Difficulties · ${difficulties.length}`} />
      <ul className="divide-y divide-line/60">
        {difficulties.map((difficulty) => (
          <li key={difficulty.id}>
            <Link
              href={`/beatmaps/${difficulty.id}`}
              aria-current={difficulty.id === current ? "page" : undefined}
              className={`flex items-center gap-2 px-4 py-2 transition hover:bg-surface-2 ${
                difficulty.id === current ? "bg-pink/[0.07]" : ""
              }`}
            >
              <DifficultyPill stars={difficulty.diff} />
              <span
                className={`truncate-flex text-sm ${
                  difficulty.id === current ? "font-bold text-pink" : "text-dim"
                }`}
              >
                {difficulty.version}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
