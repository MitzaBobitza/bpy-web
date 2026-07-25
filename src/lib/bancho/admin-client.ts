"use client";

import type {
  AssignableMapStatus,
  MappoolDetail,
  MapStatusChange,
  MapStatusScope,
  ScoreWipeResult,
} from "./admin-types";
import { apiRequest } from "./client";

/**
 * Browser-side admin actions, all going through the same-origin proxy.
 *
 * Each mirrors an in-game chat command and needs the same privilege; the
 * server rejects anything the signed-in staff member may not do, so these
 * are safe to call even if the UI gating is wrong.
 */

// ── moderation ───────────────────────────────────────────────────────────

export function addPlayerNote(playerId: number, note: string): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/notes`, {
    method: "POST",
    json: { note },
  });
}

export function silencePlayer(
  playerId: number,
  durationSeconds: number,
  reason: string,
): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/silence`, {
    method: "POST",
    json: { duration_seconds: durationSeconds, reason },
  });
}

export function unsilencePlayer(playerId: number, reason: string): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/unsilence`, {
    method: "POST",
    json: { reason },
  });
}

export function restrictPlayer(playerId: number, reason: string): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/restrict`, {
    method: "POST",
    json: { reason },
  });
}

export function unrestrictPlayer(playerId: number, reason: string): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/unrestrict`, {
    method: "POST",
    json: { reason },
  });
}

// ── privileges ───────────────────────────────────────────────────────────

export function grantPrivileges(
  playerId: number,
  privileges: string[],
): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/privileges/grant`, {
    method: "POST",
    json: { privileges },
  });
}

export function revokePrivileges(
  playerId: number,
  privileges: string[],
): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/privileges/revoke`, {
    method: "POST",
    json: { privileges },
  });
}

export function grantDonor(
  playerId: number,
  durationSeconds: number,
): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/donor`, {
    method: "POST",
    json: { duration_seconds: durationSeconds },
  });
}

// ── announcements ────────────────────────────────────────────────────────

export function sendAnnouncement(message: string): Promise<void> {
  return apiRequest<void>("/v2/admin/announcements", {
    method: "POST",
    json: { message },
  });
}

export function notifyPlayer(playerId: number, message: string): Promise<void> {
  return apiRequest<void>(`/v2/admin/players/${playerId}/notify`, {
    method: "POST",
    json: { message },
  });
}

// ── beatmaps ─────────────────────────────────────────────────────────────

export function setMapStatus(
  mapId: number,
  status: AssignableMapStatus,
  scope: MapStatusScope,
): Promise<MapStatusChange> {
  return apiRequest<MapStatusChange>(`/v2/admin/maps/${mapId}/status`, {
    method: "POST",
    json: { status, scope },
  });
}

export function wipeMapScores(mapId: number): Promise<ScoreWipeResult> {
  return apiRequest<ScoreWipeResult>(`/v2/admin/maps/${mapId}/wipe-scores`, {
    method: "POST",
    json: {},
  });
}

// ── mappools ─────────────────────────────────────────────────────────────

export function createMappool(name: string): Promise<MappoolDetail> {
  return apiRequest<MappoolDetail>("/v2/admin/mappools", {
    method: "POST",
    json: { name },
  });
}

export function deleteMappool(poolId: number): Promise<void> {
  return apiRequest<void>(`/v2/admin/mappools/${poolId}`, { method: "DELETE" });
}

export function addMappoolMap(
  poolId: number,
  mapId: number,
  mods: number,
  slot: number,
): Promise<void> {
  return apiRequest<void>(`/v2/admin/mappools/${poolId}/maps`, {
    method: "POST",
    json: { map_id: mapId, mods, slot },
  });
}

export function removeMappoolMap(
  poolId: number,
  mods: number,
  slot: number,
): Promise<void> {
  return apiRequest<void>(
    `/v2/admin/mappools/${poolId}/maps?mods=${mods}&slot=${slot}`,
    { method: "DELETE" },
  );
}
