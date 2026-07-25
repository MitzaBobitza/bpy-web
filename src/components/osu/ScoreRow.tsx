import Link from "next/link";

import { ClanTag, CountryFlag, DifficultyPill, GradeBadge, ModList } from "@/components/osu/badges";
import { Avatar } from "@/components/osu/Avatar";
import { BeatmapCover } from "@/components/osu/BeatmapCover";
import { cn } from "@/lib/cn";
import { formatAccuracy, formatNumber, formatPp, formatRelative } from "@/lib/format";
import type { MapScore, PlayerScore } from "@/lib/bancho/types";
import { isScoreable } from "@/lib/osu/beatmaps";

/**
 * One of a player's scores, with the map it was set on.
 *
 * Laid out the way osu! lists top ranks: grade first, then what was played,
 * then how it went — accuracy and pp aligned on the right so a column of
 * scores can be scanned vertically.
 */
export function ScoreRow({
  score,
  index,
  showWeight = false,
}: {
  score: PlayerScore;
  /** Position in the list, used for pp weighting. */
  index?: number;
  /** Show the 0.95^n weight osu! applies to ranked top plays. */
  showWeight?: boolean;
}) {
  const map = score.beatmap;
  const weight = index !== undefined ? 0.95 ** index : null;
  const scoreable = map ? isScoreable(map.status) : false;

  return (
    <li className="group relative">
      <Link
        href={`/scores/${score.id}`}
        className="flex items-stretch gap-0 overflow-hidden rounded-md border border-line bg-surface transition hover:border-line-bright hover:bg-surface-2"
      >
        {/* grade, on a tinted strip */}
        <div className="flex flex-none items-center justify-center bg-void/50 px-3">
          <GradeBadge grade={score.grade} />
        </div>

        {map ? (
          <BeatmapCover
            setId={map.set_id}
            size="list"
            className="hidden w-24 flex-none sm:block"
            scrim="light"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate-flex font-bold text-ink group-hover:text-pink">
              {map ? `${map.artist} - ${map.title}` : "Deleted beatmap"}
            </span>
            {map ? <DifficultyPill stars={map.diff} /> : null}
          </div>
          <div className="flex min-w-0 items-center gap-2 text-xs text-faint">
            {map ? (
              <>
                <span className="truncate-flex">[{map.version}]</span>
                <span aria-hidden="true">·</span>
                <span className="truncate-flex">mapped by {map.creator}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <time dateTime={score.play_time} className="flex-none">
              {formatRelative(score.play_time)}
            </time>
          </div>
        </div>

        <div className="flex flex-none items-center gap-3 px-3 py-2">
          <ModList mods={score.mods} size="sm" className="hidden max-w-28 justify-end md:flex" />

          <div className="hidden text-right sm:block">
            <div className="text-sm font-extrabold text-ink">{formatAccuracy(score.acc)}</div>
            <div className="text-[11px] text-faint">{formatNumber(score.score)}</div>
          </div>

          <div className="w-16 text-right">
            {scoreable || score.pp > 0 ? (
              <>
                <div className="font-mono text-base font-extrabold leading-tight text-pink">
                  {formatPp(score.pp)}
                  <span className="ml-0.5 text-[11px] font-bold text-pink-lo">pp</span>
                </div>
                {showWeight && weight !== null ? (
                  <div className="text-[11px] text-faint" title="Weighted contribution to total pp">
                    {Math.round(weight * 100)}% · {formatPp(score.pp * weight)}
                  </div>
                ) : null}
              </>
            ) : (
              <span className="text-xs font-bold text-faint" title="This map does not award pp">
                no pp
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * A row on a beatmap's leaderboard: who set it, and how.
 */
export function MapScoreRow({
  score,
  rank,
  vanillaMode,
}: {
  score: MapScore;
  rank: number;
  vanillaMode: number;
}) {
  const isTop = rank === 1;

  return (
    <tr
      className={cn(
        "border-b border-line/60 transition last:border-0 hover:bg-surface-2",
        isTop && "bg-pink/[0.06]",
      )}
    >
      <td className="w-12 px-3 py-2 text-center">
        <span className={cn("text-sm font-extrabold", isTop ? "text-pink" : "text-faint")}>
          #{rank}
        </span>
      </td>
      <td className="w-12 px-1 py-2">
        <GradeBadge grade={score.grade} size="sm" />
      </td>
      <td className="px-2 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar playerId={score.player.id} name={score.player.name} size={28} />
          <CountryFlag country={score.player.country} />
          <ClanTag clanId={score.player.clan_id} tag={score.player.clan_tag} />
          <Link
            href={`/u/${score.player.id}`}
            className="truncate-flex font-bold text-ink transition hover:text-pink"
          >
            {score.player.name}
          </Link>
        </div>
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm text-dim">
        {formatNumber(score.score)}
      </td>
      <td className="px-2 py-2 text-right text-sm font-bold text-ink">
        {formatAccuracy(score.acc)}
      </td>
      <td className="hidden px-2 py-2 text-right text-sm text-dim sm:table-cell">
        {formatNumber(score.max_combo)}x
      </td>
      <td className="hidden whitespace-nowrap px-2 py-2 text-right text-xs text-dim md:table-cell">
        <HitCounts score={score} vanillaMode={vanillaMode} />
      </td>
      <td className="px-2 py-2 text-right">
        <ModList mods={score.mods} size="sm" className="justify-end" />
      </td>
      <td className="w-16 px-3 py-2 text-right font-mono text-sm font-extrabold text-pink">
        {formatPp(score.pp)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-faint">
        <Link href={`/scores/${score.id}`} className="transition hover:text-pink">
          {formatRelative(score.play_time)}
        </Link>
      </td>
    </tr>
  );
}

function HitCounts({
  score,
  vanillaMode,
}: {
  score: MapScore;
  vanillaMode: number;
}) {
  const counts =
    vanillaMode === 3
      ? [score.ngeki, score.n300, score.nkatu, score.n100, score.n50, score.nmiss]
      : vanillaMode === 1
        ? [score.n300, score.n100, score.nmiss]
        : [score.n300, score.n100, score.n50, score.nmiss];
  return <span className="font-mono">{counts.join(" / ")}</span>;
}
