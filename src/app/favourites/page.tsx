import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BeatmapCover } from "@/components/osu/BeatmapCover";
import { DifficultyPill, StatusBadge } from "@/components/osu/badges";
import { ButtonLink, EmptyState, Panel } from "@/components/ui/primitives";
import { getFavourites, getMaps } from "@/lib/bancho/api";
import { getCurrentPlayer } from "@/lib/bancho/session";
import type { BeatmapRecord } from "@/lib/bancho/types";
import { beatmapDownloadUrl } from "@/lib/config";
import { formatDuration, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Favourite beatmaps",
  description: "Beatmap sets you have favourited.",
};

export default async function FavouritesPage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/favourites");

  const setIds = await getFavourites(player.id);

  // favourites are stored per set, so each one is resolved to its
  // difficulties to show something meaningful
  const sets = await Promise.all(
    setIds.map(async (setId) => {
      const listing = await getMaps({ setId, pageSize: 100 });
      return { setId, difficulties: listing.items };
    }),
  );

  const known = sets.filter((entry) => entry.difficulties.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header>
        <p className="eyebrow">Library</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Favourite beatmaps</h1>
        <p className="mt-1.5 text-sm text-dim">
          {setIds.length === 0
            ? "You have not favourited anything yet."
            : `${setIds.length} ${setIds.length === 1 ? "set" : "sets"}. Favourites are shared with the game client.`}
        </p>
      </header>

      {setIds.length === 0 ? (
        <Panel className="mt-6">
          <EmptyState
            title="Nothing favourited"
            description="Favourite a beatmap from its page here, or with the star in osu!direct."
            action={
              <ButtonLink href="/beatmaps" size="sm" className="mt-1">
                Browse beatmaps
              </ButtonLink>
            }
          />
        </Panel>
      ) : (
        <ul className="mt-6 space-y-3">
          {known.map((entry) => (
            <FavouriteSet key={entry.setId} difficulties={entry.difficulties} />
          ))}
          {known.length < setIds.length ? (
            <li className="panel px-4 py-3 text-sm text-faint">
              {setIds.length - known.length}{" "}
              {setIds.length - known.length === 1 ? "set is" : "sets are"} favourited but not in the
              server&apos;s beatmap database yet. They appear here once someone plays them.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function FavouriteSet({ difficulties }: { difficulties: BeatmapRecord[] }) {
  // every difficulty in a set shares artist, title and creator
  const [first] = difficulties;
  const sorted = [...difficulties].sort((a, b) => a.diff - b.diff);
  const totalPlays = difficulties.reduce((sum, map) => sum + map.plays, 0);

  return (
    <li>
      <Panel className="overflow-hidden">
        <div className="flex min-w-0 flex-col sm:flex-row">
          <Link href={`/beatmaps/${sorted[0].id}`} className="sm:w-56 sm:flex-none">
            <BeatmapCover setId={first.set_id} size="card" className="h-28 sm:h-full" scrim="light" />
          </Link>

          <div className="min-w-0 flex-1 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate-flex text-lg font-extrabold leading-tight text-ink">
                  {first.title}
                </h2>
                <p className="truncate-flex text-sm text-dim">{first.artist}</p>
                <p className="mt-0.5 text-xs text-faint">
                  mapped by {first.creator} · {formatNumber(totalPlays)} plays ·{" "}
                  {formatDuration(first.total_length)}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <StatusBadge status={first.status} />
                <a
                  href={beatmapDownloadUrl(first.set_id)}
                  rel="noreferrer noopener"
                  className="text-xs font-bold text-pink transition hover:text-pink-hi"
                >
                  Download
                </a>
              </div>
            </div>

            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {sorted.map((map) => (
                <li key={map.id}>
                  <Link
                    href={`/beatmaps/${map.id}`}
                    className="inline-flex items-center gap-1.5 rounded border border-line bg-void px-2 py-1 transition hover:border-line-bright"
                    title={`${map.version} — ${map.diff.toFixed(2)} stars`}
                  >
                    <DifficultyPill stars={map.diff} />
                    <span className="max-w-32 truncate text-xs text-dim">{map.version}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </li>
  );
}
