"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/components/ui/primitives";

/**
 * Text filters for the beatmap listing.
 *
 * bancho.py matches artist and creator exactly, so these are submitted
 * deliberately rather than as-you-type — a partial word would return
 * nothing and look broken.
 */
export function BeatmapFilters({ artist, creator }: { artist: string; creator: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [artistValue, setArtistValue] = useState(artist);
  const [creatorValue, setCreatorValue] = useState(creator);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of [
      ["artist", artistValue.trim()],
      ["creator", creatorValue.trim()],
    ] as const) {
      if (value) search.set(key, value);
      else search.delete(key);
    }
    search.delete("page");
    router.push(`/beatmaps?${search.toString()}`);
  }

  function clear() {
    const search = new URLSearchParams(params.toString());
    search.delete("artist");
    search.delete("creator");
    search.delete("page");
    setArtistValue("");
    setCreatorValue("");
    router.push(`/beatmaps?${search.toString()}`);
  }

  const hasFilters = Boolean(artistValue || creatorValue);

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <span className="w-16 flex-none pb-2.5 text-[11px] font-bold uppercase tracking-wider text-faint">
        Find
      </span>
      <div>
        <label htmlFor="filter-artist" className="mb-1 block text-[11px] font-bold text-faint">
          Artist
        </label>
        <Input
          id="filter-artist"
          value={artistValue}
          onChange={(event) => setArtistValue(event.target.value)}
          placeholder="Exact artist name"
          className="h-8 w-44 text-xs"
        />
      </div>
      <div>
        <label htmlFor="filter-creator" className="mb-1 block text-[11px] font-bold text-faint">
          Mapper
        </label>
        <Input
          id="filter-creator"
          value={creatorValue}
          onChange={(event) => setCreatorValue(event.target.value)}
          placeholder="Exact mapper name"
          className="h-8 w-44 text-xs"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Apply
      </Button>
      {hasFilters ? (
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      ) : null}
    </form>
  );
}
