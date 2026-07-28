/**
 * Multiplayer match slots, mirroring bancho.py's `Matches`
 * (app/objects/collections.py).
 *
 * Matches live in memory in a fixed-size list, and a match's id *is* its
 * index into that list — so ids run from 0 to `MAX_MATCHES - 1`. There is no
 * "list matches" endpoint, so callers probe the ids to find the live ones.
 */

export const MAX_MATCHES = 64;

/** Every addressable match id, in order. */
export const MATCH_SLOT_IDS: readonly number[] = Array.from(
  { length: MAX_MATCHES },
  (_, index) => index,
);
