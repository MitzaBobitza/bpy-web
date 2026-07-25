import "server-only";

import { apiGet, apiGetPage, query } from "./server";
import type {
  AdminCapabilities,
  AdminClanMember,
  AdminClanSummary,
  AuditLogEntry,
  HardwareMatch,
  LoginRecord,
  MappoolDetail,
  MapRequestSummary,
  PlayerAdminView,
} from "./admin-types";
import type { Page } from "./types";

/**
 * Server-side reads for the admin panel.
 *
 * Every one of these is privilege-gated upstream. They return null or an
 * empty listing when the caller lacks the privilege, so a page can render
 * the sections its capabilities allow without special-casing failures.
 */

export async function getAdminCapabilities(): Promise<AdminCapabilities | null> {
  const result = await apiGet<AdminCapabilities>("/v2/admin/capabilities", {
    authenticated: true,
  });
  return result?.data ?? null;
}

export async function getPlayerAdminView(
  playerId: number,
): Promise<PlayerAdminView | null> {
  const result = await apiGet<PlayerAdminView>(`/v2/admin/players/${playerId}`, {
    authenticated: true,
  });
  return result?.data ?? null;
}

export async function getAuditLog(
  options: {
    subjectId?: number;
    actorId?: number;
    action?: string;
    days?: number;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Page<AuditLogEntry>> {
  const { subjectId, actorId, action, days, page = 1, pageSize = 50 } = options;
  return apiGetPage<AuditLogEntry>(
    `/v2/admin/audit-log${query({
      subject_id: subjectId,
      actor_id: actorId,
      action,
      days,
      page,
      page_size: pageSize,
    })}`,
    { authenticated: true },
  );
}

export async function getPlayerLogins(
  playerId: number,
  options: { page?: number; pageSize?: number } = {},
): Promise<Page<LoginRecord>> {
  const { page = 1, pageSize = 25 } = options;
  return apiGetPage<LoginRecord>(
    `/v2/admin/players/${playerId}/logins${query({ page, page_size: pageSize })}`,
    { authenticated: true },
  );
}

export async function getPlayerHardwareMatches(
  playerId: number,
): Promise<HardwareMatch[]> {
  const result = await apiGet<HardwareMatch[]>(
    `/v2/admin/players/${playerId}/hardware-matches`,
    { authenticated: true },
  );
  return result?.data ?? [];
}

export async function getMapRequests(): Promise<MapRequestSummary[]> {
  const result = await apiGet<MapRequestSummary[]>("/v2/admin/map-requests", {
    authenticated: true,
  });
  return result?.data ?? [];
}

export async function getMappools(): Promise<MappoolDetail[]> {
  const result = await apiGet<MappoolDetail[]>("/v2/admin/mappools", {
    authenticated: true,
  });
  return result?.data ?? [];
}

export async function getAdminClans(
  options: { search?: string; page?: number; pageSize?: number } = {},
): Promise<Page<AdminClanSummary>> {
  const { search, page = 1, pageSize = 25 } = options;
  return apiGetPage<AdminClanSummary>(
    `/v2/admin/clans${query({ search, page, page_size: pageSize })}`,
    { authenticated: true },
  );
}

export async function getAdminClan(clanId: number): Promise<AdminClanSummary | null> {
  const result = await apiGet<AdminClanSummary>(`/v2/admin/clans/${clanId}`, {
    authenticated: true,
  });
  return result?.data ?? null;
}

/** The full roster, hidden members included. */
export async function getAdminClanMembers(clanId: number): Promise<AdminClanMember[]> {
  const result = await apiGet<AdminClanMember[]>(`/v2/admin/clans/${clanId}/members`, {
    authenticated: true,
  });
  return result?.data ?? [];
}
