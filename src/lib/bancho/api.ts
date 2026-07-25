import "server-only";

import { apiGet, apiGetPage, query, upstreamFetch } from "./server";
import type {
  BeatmapRecord,
  Clan,
  ClanWithMembers,
  LeaderboardEntry,
  Mappool,
  MapRating,
  MapScore,
  Match,
  MostPlayedMap,
  Page,
  Player,
  PlayerScore,
  PlayerStats,
  PlayerStatus,
  Score,
  ScoreDetail,
  SearchPlayer,
  ServerStats,
} from "./types";

/**
 * Typed wrappers over bancho.py's HTTP API.
 *
 * Reads are live: this is game data, and the upstream normally sits on the
 * same host, so nothing here is cached beyond per-render deduplication.
 */

// ── server ───────────────────────────────────────────────────────────────

export async function getServerStats(): Promise<ServerStats | null> {
  const result = await apiGet<ServerStats>("/v2/server/stats");
  return result?.data ?? null;
}

// ── players ──────────────────────────────────────────────────────────────

export async function getPlayer(idOrName: string | number): Promise<Player | null> {
  // usernames may be all digits, which would otherwise be read as an id
  const key = typeof idOrName === "number" || /^\d+$/.test(String(idOrName)) ? "id" : "username";
  const result = await apiGet<Player>(
    `/v2/players/${encodeURIComponent(String(idOrName))}${query({ key })}`,
    { authenticated: true },
  );
  return result?.data ?? null;
}

export async function getPlayerStats(playerId: number, mode: number): Promise<PlayerStats | null> {
  const result = await apiGet<PlayerStats>(`/v2/players/${playerId}/stats/${mode}`, {
    authenticated: true,
  });
  return result?.data ?? null;
}

export async function getAllPlayerStats(playerId: number): Promise<PlayerStats[]> {
  const page = await apiGetPage<PlayerStats>(`/v2/players/${playerId}/stats?page_size=100`, {
    authenticated: true,
  });
  return page.items;
}

export async function getPlayerStatus(playerId: number): Promise<PlayerStatus | null> {
  const result = await apiGet<PlayerStatus>(`/v2/players/${playerId}/status`);
  return result?.data ?? null;
}

export async function getPlayerScores(
  playerId: number,
  options: {
    scope?: "best" | "recent";
    mode?: number;
    limit?: number;
    includeLoved?: boolean;
    includeFailed?: boolean;
  } = {},
): Promise<PlayerScore[]> {
  const {
    scope = "best",
    mode = 0,
    limit = 50,
    includeLoved = true,
    includeFailed = true,
  } = options;
  const result = await apiGet<PlayerScore[]>(
    `/v2/players/${playerId}/scores${query({
      scope,
      mode,
      limit,
      include_loved: includeLoved,
      include_failed: includeFailed,
    })}`,
    { authenticated: true },
  );
  return result?.data ?? [];
}

export async function getPlayerMostPlayed(
  playerId: number,
  mode = 0,
  limit = 20,
): Promise<MostPlayedMap[]> {
  const result = await apiGet<MostPlayedMap[]>(
    `/v2/players/${playerId}/most_played${query({ mode, limit })}`,
    { authenticated: true },
  );
  return result?.data ?? [];
}

export async function getPlayers(
  options: {
    country?: string;
    clanId?: number;
    preferredMode?: number;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Page<Player>> {
  const { country, clanId, preferredMode, page = 1, pageSize = 50 } = options;
  return apiGetPage<Player>(
    `/v2/players${query({
      country,
      clan_id: clanId,
      preferred_mode: preferredMode,
      page,
      page_size: pageSize,
    })}`,
  );
}

export async function searchPlayers(q: string): Promise<SearchPlayer[]> {
  if (q.trim().length < 2) return [];
  const result = await apiGet<SearchPlayer[]>(`/v2/players/search${query({ q })}`, {
    authenticated: true,
  });
  return result?.data ?? [];
}

/** The signed-in player's friends. bancho.py lets nobody else read it. */
export async function getFriends(playerId: number): Promise<Player[]> {
  const result = await apiGet<Player[]>(`/v2/players/${playerId}/friends`, {
    authenticated: true,
  });
  return result?.data ?? [];
}

export async function getFavourites(playerId: number): Promise<number[]> {
  const result = await apiGet<number[]>(`/v2/players/${playerId}/favourites`, {
    authenticated: true,
  });
  return result?.data ?? [];
}

// ── leaderboards ─────────────────────────────────────────────────────────

export type LeaderboardSort = "pp" | "rscore" | "tscore" | "acc" | "plays" | "playtime";

export async function getLeaderboard(options: {
  mode?: number;
  sort?: LeaderboardSort;
  country?: string;
  page?: number;
  pageSize?: number;
}): Promise<LeaderboardEntry[]> {
  const { mode = 0, sort = "pp", country, page = 1, pageSize = 50 } = options;
  const result = await apiGet<LeaderboardEntry[]>(
    `/v2/leaderboards/${mode}${query({ sort, country, page, page_size: pageSize })}`,
  );
  return result?.data ?? [];
}

// ── maps ─────────────────────────────────────────────────────────────────

export async function getMaps(
  options: {
    setId?: number;
    status?: number;
    artist?: string;
    creator?: string;
    mode?: number;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Page<BeatmapRecord>> {
  const { setId, status, artist, creator, mode, page = 1, pageSize = 50 } = options;
  return apiGetPage<BeatmapRecord>(
    `/v2/maps${query({
      set_id: setId,
      status,
      artist,
      creator,
      mode,
      page,
      page_size: pageSize,
    })}`,
  );
}

export async function getMap(mapId: number): Promise<BeatmapRecord | null> {
  const result = await apiGet<BeatmapRecord>(`/v2/maps/${mapId}`);
  return result?.data ?? null;
}

export async function getMapRating(mapId: number): Promise<MapRating | null> {
  const result = await apiGet<MapRating>(`/v2/maps/${mapId}/rating`);
  return result?.data ?? null;
}

export async function getMapScores(
  mapId: number,
  options: { scope?: "best" | "recent"; mode?: number; limit?: number } = {},
): Promise<MapScore[]> {
  const { scope = "best", mode = 0, limit = 50 } = options;
  const result = await apiGet<MapScore[]>(
    `/v2/maps/${mapId}/scores${query({ scope, mode, limit })}`,
  );
  return result?.data ?? [];
}

// ── scores ───────────────────────────────────────────────────────────────

export async function getScore(scoreId: number): Promise<ScoreDetail | null> {
  const result = await apiGet<ScoreDetail>(`/v2/scores/${scoreId}`, { authenticated: true });
  return result?.data ?? null;
}

export async function getScores(
  options: {
    mapMd5?: string;
    mods?: number;
    status?: number;
    mode?: number;
    userId?: number;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Page<Score>> {
  const { mapMd5, mods, status, mode, userId, page = 1, pageSize = 50 } = options;
  return apiGetPage<Score>(
    `/v2/scores${query({
      map_md5: mapMd5,
      mods,
      status,
      mode,
      user_id: userId,
      page,
      page_size: pageSize,
    })}`,
  );
}

// ── clans ────────────────────────────────────────────────────────────────

export async function getClans(page = 1, pageSize = 50): Promise<Page<Clan>> {
  return apiGetPage<Clan>(`/v2/clans${query({ page, page_size: pageSize })}`);
}

export async function getClan(clanId: number): Promise<Clan | null> {
  const result = await apiGet<Clan>(`/v2/clans/${clanId}`);
  return result?.data ?? null;
}

/**
 * Fetch a bare (non-enveloped) v1 payload.
 *
 * The v1 router is mounted under `/v1` and answers with plain objects
 * rather than the v2 envelope, reporting failures as a `status` string.
 */
async function v1Get<T>(path: string): Promise<T | null> {
  try {
    const response = await upstreamFetch(path);
    if (!response.ok) return null;
    const payload = (await response.json()) as T & { status?: string };
    if (typeof payload?.status === "string" && payload.status !== "success") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Clan membership, which only the v1 API exposes. */
export async function getClanWithMembers(clanId: number): Promise<ClanWithMembers | null> {
  return v1Get<ClanWithMembers>(`/v1/get_clan${query({ id: clanId })}`);
}

// ── multiplayer & tournaments (v1 only) ──────────────────────────────────

/** Live multiplayer match state. bancho.py holds match slots 1-64 in memory. */
export async function getMatch(matchId: number): Promise<Match | null> {
  const payload = await v1Get<{ status: string; match: Match }>(
    `/v1/get_match${query({ id: matchId })}`,
  );
  return payload?.match ?? null;
}

/** Scan every match slot, returning the ones currently in use. */
export async function getActiveMatches(): Promise<{ id: number; match: Match }[]> {
  const slots = Array.from({ length: 64 }, (_, index) => index + 1);
  const results = await Promise.all(
    slots.map(async (id) => {
      const match = await getMatch(id);
      return match ? { id, match } : null;
    }),
  );
  return results.filter((entry): entry is { id: number; match: Match } => entry !== null);
}

export async function getMappool(poolId: number): Promise<Mappool | null> {
  return v1Get<Mappool>(`/v1/get_mappool${query({ id: poolId })}`);
}

/** Collect the mappools that exist, up to a bounded number of ids. */
export async function getMappools(limit = 24): Promise<Mappool[]> {
  const ids = Array.from({ length: limit }, (_, index) => index + 1);
  const results = await Promise.all(ids.map((id) => getMappool(id)));
  return results.filter((pool): pool is Mappool => pool !== null);
}
