import Link from "next/link";

import type { PlayerScore } from "@/lib/bancho/types";
import { formatPp } from "@/lib/format";

/**
 * The shape of a player's top plays: one bar per ranked score, ordered by
 * pp. Height is the only magnitude encoding, so the fill stays a single
 * hue rather than a ramp.
 *
 * The colour is the osu! pink stepped down to #e0559a, which sits inside
 * the lightness band for a dark chart surface (the site pink, #ff66ab, is
 * too light against it and is used for the hover state instead).
 *
 * The "Top plays" list rendered below this chart is its table view — the
 * same records, readable without colour.
 */
const BAR_COLOR = "#e0559a";

/** Below this, the list of top plays says everything the chart would. */
const MIN_PLAYS = 8;

export function TopPlaysChart({ scores }: { scores: PlayerScore[] }) {
  const plays = scores.filter((score) => score.pp > 0).slice(0, 50);
  if (plays.length < MIN_PLAYS) return null;

  const peak = Math.max(...plays.map((score) => score.pp));

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">pp of top {plays.length} plays</span>
        <span className="font-mono text-xs text-faint">
          best {formatPp(peak)}pp
        </span>
      </figcaption>

      <div className="mt-3 flex h-24 items-end justify-start gap-[2px]" role="list">
        {plays.map((score, index) => {
          const height = Math.max(3, (score.pp / peak) * 100);
          const map = score.beatmap;
          const label = map
            ? `${map.artist} - ${map.title} [${map.version}] — ${formatPp(score.pp)}pp`
            : `${formatPp(score.pp)}pp`;

          return (
            <Link
              key={score.id}
              href={`/scores/${score.id}`}
              role="listitem"
              title={label}
              aria-label={`Top play ${index + 1}: ${label}`}
              className="group/bar relative flex-1 rounded-t transition-colors"
              style={{ height: `${height}%`, backgroundColor: BAR_COLOR, minWidth: 2, maxWidth: 18 }}
            >
              <span className="absolute inset-0 rounded-t bg-pink opacity-0 transition-opacity group-hover/bar:opacity-100" />
            </Link>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-faint">
        <span>#1</span>
        <span>#{plays.length}</span>
      </div>
    </figure>
  );
}
