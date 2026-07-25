"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addFavourite, ApiError, removeFavourite } from "@/lib/bancho/client";
import { cn } from "@/lib/cn";

/**
 * Favourite a beatmap set.
 *
 * Favourites are per set rather than per difficulty, which is how the game
 * client stores them too — so this appears once on the set's header.
 */
export function FavouriteButton({
  viewerId,
  setId,
  initiallyFavourite,
}: {
  viewerId: number;
  setId: number;
  initiallyFavourite: boolean;
}) {
  const router = useRouter();
  const [favourite, setFavourite] = useState(initiallyFavourite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (favourite) {
        await removeFavourite(viewerId, setId);
        setFavourite(false);
      } else {
        await addFavourite(viewerId, setId);
        setFavourite(true);
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={favourite}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition disabled:opacity-60",
          favourite
            ? "border-pink/50 bg-pink/15 text-pink"
            : "border-line-bright bg-surface-3/80 text-ink hover:bg-line-bright",
        )}
      >
        <span aria-hidden="true">{favourite ? "★" : "☆"}</span>
        {favourite ? "Favourited" : "Favourite"}
      </button>
      {error ? <span className="text-xs font-semibold text-coral">{error}</span> : null}
    </>
  );
}
