/** Clan shapes from bancho.py's `/v2/clans` endpoints. */

export type Clan = {
  id: number;
  name: string;
  tag: string;
  owner: number;
  created_at: string;
};

/** 1 = member, 2 = officer, 3 = owner. */
export type ClanRank = 1 | 2 | 3;

export type ClanRosterMember = {
  id: number;
  name: string;
  country: string;
  priv: number;
  clan_priv: number;
};

/** An invite a clan has sent, as its officers see it. */
export type ClanInvite = {
  id: number;
  clan_id: number;
  user_id: number;
  username: string;
  created_by: number;
  created_at: string;
};

/** An invite awaiting the signed-in player. */
export type PendingClanInvite = {
  id: number;
  clan: Clan;
  invited_by: string | null;
  created_at: string;
};

/**
 * What the signed-in player may do with a clan.
 *
 * The server sends this and enforces the same rules, so the page can hide
 * controls without them becoming merely invisible rather than unreachable.
 */
export type ClanMembership = {
  clan_priv: number;
  is_member: boolean;
  can_invite: boolean;
  can_kick: boolean;
  can_manage_ranks: boolean;
  can_edit: boolean;
  can_transfer: boolean;
  can_disband: boolean;
  can_leave: boolean;
};
