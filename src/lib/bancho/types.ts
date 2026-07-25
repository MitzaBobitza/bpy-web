/**
 * Response types mirroring bancho.py's API models.
 *
 * v2 models live in `app/api/v2/models/`; v1 shapes are read off the
 * handlers in `app/api/v1/api.py`.
 */

// ── envelopes ────────────────────────────────────────────────────────────

export interface Meta {
  total?: number;
  page?: number;
  page_size?: number;
  scope?: string;
  mode?: number;
}

export interface SuccessEnvelope<T> {
  status: "success";
  data: T;
  meta: Meta;
}

export interface FailureEnvelope {
  status: "error";
  error: string;
}

export type Envelope<T> = SuccessEnvelope<T> | FailureEnvelope;

/** A paged v2 listing: the rows plus the envelope's `meta`. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── players ──────────────────────────────────────────────────────────────

export interface Player {
  id: number;
  name: string;
  safe_name: string;
  priv: number;
  country: string;
  silence_end: number;
  donor_end: number;
  creation_time: number;
  latest_activity: number;
  clan_id: number;
  clan_priv: number;
  preferred_mode: number;
  play_style: number;
  custom_badge_name: string | null;
  custom_badge_icon: string | null;
  userpage_content: string | null;
}

export interface PlayerStats {
  id: number;
  mode: number;
  tscore: number;
  rscore: number;
  pp: number;
  plays: number;
  playtime: number;
  acc: number;
  max_combo: number;
  total_hits: number;
  replay_views: number;
  xh_count: number;
  x_count: number;
  sh_count: number;
  s_count: number;
  a_count: number;
  /** null when the player is unranked for the mode. */
  rank: number | null;
  country_rank: number | null;
}

export interface PlayerStatus {
  login_time: number;
  action: number;
  info_text: string;
  mode: number;
  mods: number;
  beatmap_id: number;
}

export interface SearchPlayer {
  id: number;
  name: string;
}

// ── scores & maps ────────────────────────────────────────────────────────

export interface ScoreBeatmap {
  id: number;
  set_id: number;
  md5: string;
  status: number;
  artist: string;
  title: string;
  version: string;
  creator: string;
  last_update: string;
  total_length: number;
  max_combo: number;
  plays: number;
  passes: number;
  mode: number;
  bpm: number;
  cs: number;
  ar: number;
  od: number;
  hp: number;
  diff: number;
}

export interface ScoreBase {
  id: number;
  map_md5: string;
  score: number;
  pp: number;
  acc: number;
  max_combo: number;
  mods: number;
  n300: number;
  n100: number;
  n50: number;
  nmiss: number;
  ngeki: number;
  nkatu: number;
  grade: string;
  status: number;
  mode: number;
  play_time: string;
  time_elapsed: number;
  perfect: boolean;
}

export interface Score extends ScoreBase {
  userid: number;
}

export interface ScorePlayer {
  id: number;
  name: string;
  country: string;
  clan_id: number | null;
  clan_name: string | null;
  clan_tag: string | null;
}

/** A player's score with the beatmap it was set on. */
export interface PlayerScore extends ScoreBase {
  beatmap: ScoreBeatmap | null;
}

/** A score on a map's leaderboard, with the player who set it. */
export interface MapScore extends ScoreBase {
  player: ScorePlayer;
}

/** A single score with both its beatmap and player. */
export interface ScoreDetail extends Score {
  beatmap: ScoreBeatmap;
  player: ScorePlayer;
}

export interface BeatmapRecord {
  id: number;
  server: string;
  set_id: number;
  status: number;
  md5: string;
  artist: string;
  title: string;
  version: string;
  creator: string;
  filename: string;
  last_update: string;
  total_length: number;
  max_combo: number;
  frozen: boolean;
  plays: number;
  passes: number;
  mode: number;
  bpm: number;
  cs: number;
  ar: number;
  od: number;
  hp: number;
  diff: number;
}

export interface MostPlayedMap {
  id: number;
  set_id: number;
  md5: string;
  status: number;
  artist: string;
  title: string;
  version: string;
  creator: string;
  /** How many times this player has played the map. */
  plays: number;
}

export interface MapRating {
  average: number | null;
  count: number;
}

// ── clans, leaderboards, server ──────────────────────────────────────────

export interface Clan {
  id: number;
  name: string;
  tag: string;
  owner: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: number;
  name: string;
  country: string;
  clan_id: number | null;
  clan_name: string | null;
  clan_tag: string | null;
  tscore: number;
  rscore: number;
  pp: number;
  acc: number;
  plays: number;
  playtime: number;
  max_combo: number;
  xh_count: number;
  x_count: number;
  sh_count: number;
  s_count: number;
  a_count: number;
}

export interface ServerStats {
  online_players: number;
  total_players: number;
}

// ── v1-only shapes ───────────────────────────────────────────────────────

/** `GET /get_clan` — the only endpoint exposing clan membership. */
export interface ClanWithMembers {
  id: number;
  name: string;
  tag: string;
  members: ClanMember[];
  owner: ClanMember | null;
}

export interface ClanMember {
  id: number;
  name: string;
  country: string;
  rank: "Member" | "Officer" | "Owner";
}

/** `GET /get_match` — live multiplayer match state. */
export interface Match {
  name: string;
  mode: number;
  mods: number;
  seed: number;
  host: { id: number; name: string };
  refs: { id: number; name: string }[];
  in_progress: boolean;
  is_scrimming: boolean;
  map: { id: number; md5: string | null; name: string | null };
  active_slots: Record<string, MatchSlot>;
}

export interface MatchSlot {
  loaded: boolean;
  mods: number;
  player: { id: number; name: string };
  skipped: boolean;
  status: number;
  team: number;
}

/** `GET /get_mappool` — a tournament mappool. */
export interface Mappool {
  id: number;
  name: string;
  created_at: string;
  created_by: {
    id: number;
    name: string;
    country: string;
    clan: { id: number; name: string; tag: string; members: number } | null;
    online: boolean;
  };
  maps: Record<string, MappoolMap>;
}

export interface MappoolMap {
  id: number;
  md5: string;
  set_id: number;
  artist: string;
  title: string;
  version: string;
  creator: string;
  last_update: number | string;
  total_length: number;
  max_combo: number;
  status: number;
  plays: number;
  passes: number;
  mode: number;
  bpm: number;
  cs: number;
  od: number;
  ar: number;
  hp: number;
  diff: number;
}

/** `GET /get_player_count`. */
export interface PlayerCounts {
  online: number;
  total: number;
}
