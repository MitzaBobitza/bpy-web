/**
 * Response types for bancho.py's `/v2/admin` endpoints.
 *
 * Mirrors `app/api/v2/models/admin.py`.
 */

/** What the signed-in staff member is allowed to do. */
export interface AdminCapabilities {
  is_staff: boolean;
  // moderator
  view_audit_log: boolean;
  add_notes: boolean;
  silence_players: boolean;
  // administrator
  restrict_players: boolean;
  send_announcements: boolean;
  view_player_investigation: boolean;
  // nominator
  manage_map_status: boolean;
  view_nomination_queue: boolean;
  // tournament manager
  manage_mappools: boolean;
  // developer
  manage_privileges: boolean;
  grant_donor: boolean;
  wipe_map_scores: boolean;
  manage_staff: boolean;
}

export type Capability = keyof Omit<AdminCapabilities, "is_staff">;

export interface AuditLogEntry {
  id: number;
  action: string;
  message: string | null;
  created_at: string;
  actor_id: number;
  actor_name: string | null;
  subject_id: number;
  subject_name: string | null;
}

/** The moderation-facing view of an account. */
export interface PlayerAdminView {
  id: number;
  name: string;
  priv: number;
  privilege_names: string[];
  country: string;

  is_online: boolean;
  restricted: boolean;
  silenced: boolean;
  remaining_silence_seconds: number;
  silence_end: number;

  is_donor: boolean;
  donor_end: number;

  creation_time: number;
  latest_activity: number;
  clan_id: number;
  clan_priv: number;

  login_count: number;
}

export interface LoginRecord {
  id: number;
  ip: string;
  osu_version: string;
  osu_stream: string;
  created_at: string;
}

/** Another account sharing hardware identifiers with the subject. */
export interface HardwareMatch {
  player_id: number;
  player_name: string;
  priv: number;
  osu_path: string;
  adapters: string;
  uninstall_id: string;
  disk_serial: string;
  last_seen: string;
  occurrences: number;
}

export interface MapRequestSummary {
  map_id: number;
  set_id: number;
  artist: string;
  title: string;
  version: string;
  creator: string;
  status: number;
  request_count: number;
  first_requested_at: string;
  last_requested_at: string;
  requester_ids: number[];
  requester_names: string[];
}

export interface MapStatusChange {
  updated_map_ids: number[];
}

export interface ScoreWipeResult {
  map_id: number;
  deleted_scores: number;
}

export interface MappoolMapEntry {
  map_id: number;
  mods: number;
  slot: number;
  /** The label tournaments use, e.g. "HD2". */
  pick: string;
  artist: string | null;
  title: string | null;
  version: string | null;
  creator: string | null;
}

export interface MappoolDetail {
  id: number;
  name: string;
  created_at: string;
  created_by: number;
  created_by_name: string | null;
  maps: MappoolMapEntry[];
}

/** The statuses a nominator may assign, as the API names them. */
export type AssignableMapStatus = "rank" | "unrank" | "love";

/** Whether a status change covers one difficulty or the whole set. */
export type MapStatusScope = "map" | "set";
