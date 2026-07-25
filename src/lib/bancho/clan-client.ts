"use client";

import type { Clan, ClanInvite, ClanRosterMember } from "./clan-types";
import { apiRequest } from "./client";

/**
 * Browser-side clan actions, all going through the same-origin proxy.
 *
 * Each mirrors a `!clan` chat command and needs the same clan rank. The
 * server re-checks every one, so these are safe to call even if the page
 * offered a control it should not have.
 */

// ── the clan itself ──────────────────────────────────────────────────────

export function createClan(tag: string, name: string): Promise<Clan> {
  return apiRequest<Clan>("/v2/clans", { method: "POST", json: { tag, name } });
}

export function updateClan(
  clanId: number,
  changes: { name?: string; tag?: string },
): Promise<Clan> {
  return apiRequest<Clan>(`/v2/clans/${clanId}`, { method: "PATCH", json: changes });
}

export function disbandClan(clanId: number): Promise<Clan> {
  return apiRequest<Clan>(`/v2/clans/${clanId}`, { method: "DELETE" });
}

export function transferClan(clanId: number, userId: number): Promise<Clan> {
  return apiRequest<Clan>(`/v2/clans/${clanId}/owner`, {
    method: "PUT",
    json: { user_id: userId },
  });
}

// ── membership ───────────────────────────────────────────────────────────

export function leaveClan(clanId: number): Promise<Clan> {
  return apiRequest<Clan>(`/v2/clans/${clanId}/leave`, { method: "POST" });
}

export function kickClanMember(
  clanId: number,
  userId: number,
): Promise<ClanRosterMember> {
  return apiRequest<ClanRosterMember>(`/v2/clans/${clanId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function setClanMemberRank(
  clanId: number,
  userId: number,
  clanPriv: 1 | 2,
): Promise<ClanRosterMember> {
  return apiRequest<ClanRosterMember>(
    `/v2/clans/${clanId}/members/${userId}/rank`,
    { method: "PUT", json: { clan_priv: clanPriv } },
  );
}

// ── invitations ──────────────────────────────────────────────────────────

export function inviteToClan(clanId: number, username: string): Promise<ClanInvite> {
  return apiRequest<ClanInvite>(`/v2/clans/${clanId}/invites`, {
    method: "POST",
    json: { username },
  });
}

export function revokeClanInvite(clanId: number, inviteId: number): Promise<void> {
  return apiRequest<void>(`/v2/clans/${clanId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export function acceptClanInvitation(inviteId: number): Promise<Clan> {
  return apiRequest<Clan>(`/v2/clans/invitations/${inviteId}/accept`, {
    method: "POST",
  });
}

export function declineClanInvitation(inviteId: number): Promise<void> {
  return apiRequest<void>(`/v2/clans/invitations/${inviteId}/decline`, {
    method: "POST",
  });
}
