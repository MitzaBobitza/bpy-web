import "server-only";

import type {
  ClanInvite,
  ClanMembership,
  ClanRosterMember,
  PendingClanInvite,
} from "./clan-types";
import { apiGet } from "./server";

/**
 * Server-side clan reads.
 *
 * The roster and membership endpoints answer relative to the signed-in
 * player: rosters hide players that viewer may not see, and membership
 * reports which controls to offer. Both are enforced upstream as well.
 */

export async function getClanRoster(clanId: number): Promise<ClanRosterMember[]> {
  const result = await apiGet<ClanRosterMember[]>(`/v2/clans/${clanId}/members`, {
    authenticated: true,
  });
  return result?.data ?? [];
}

export async function getClanMembership(
  clanId: number,
): Promise<ClanMembership | null> {
  const result = await apiGet<ClanMembership>(`/v2/clans/${clanId}/membership`, {
    authenticated: true,
  });
  return result?.data ?? null;
}

/** Outstanding invites a clan has sent. Officers only; empty otherwise. */
export async function getClanInvites(clanId: number): Promise<ClanInvite[]> {
  const result = await apiGet<ClanInvite[]>(`/v2/clans/${clanId}/invites`, {
    authenticated: true,
  });
  return result?.data ?? [];
}

/** Invites awaiting the signed-in player. Empty when signed out. */
export async function getMyClanInvitations(): Promise<PendingClanInvite[]> {
  const result = await apiGet<PendingClanInvite[]>("/v2/clans/invitations", {
    authenticated: true,
  });
  return result?.data ?? [];
}
