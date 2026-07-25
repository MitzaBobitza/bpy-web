"use client";

import type { Envelope, Player, SearchPlayer, ServerStats } from "./types";

/**
 * Browser-side API access.
 *
 * Everything goes through the same-origin `/bancho` proxy so the http-only
 * session cookie is sent automatically.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  let body = rest.body;

  if (json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetch(`/bancho${path}`, {
      ...rest,
      body,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  // 204s and replay downloads have no JSON body
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) throw new ApiError(`Request failed (${response.status}).`, response.status);
    return undefined as T;
  }

  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || payload.status !== "success") {
    const message =
      payload.status === "error" ? payload.error : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return payload.data;
}

// ── sessions ─────────────────────────────────────────────────────────────

export function login(username: string, password: string): Promise<Player> {
  return request<Player>("/v2/sessions", { method: "POST", json: { username, password } });
}

export function logout(): Promise<void> {
  return request<void>("/v2/sessions/current", { method: "DELETE" });
}

export function register(args: {
  username: string;
  email: string;
  password: string;
  captchaToken?: string;
}): Promise<Player> {
  return request<Player>("/v2/accounts", {
    method: "POST",
    json: {
      username: args.username,
      email: args.email,
      password: args.password,
      captcha_token: args.captchaToken ?? null,
    },
  });
}

// ── profile & account ────────────────────────────────────────────────────

export function updateProfile(
  playerId: number,
  changes: {
    username?: string;
    country?: string;
    preferred_mode?: number;
    userpage_content?: string | null;
  },
): Promise<Player> {
  return request<Player>(`/v2/players/${playerId}`, { method: "PATCH", json: changes });
}

export function changePassword(
  playerId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return request<void>(`/v2/players/${playerId}/password`, {
    method: "PUT",
    json: { current_password: currentPassword, new_password: newPassword },
  });
}

export function uploadAvatar(playerId: number, file: File): Promise<void> {
  const form = new FormData();
  form.append("avatar_file", file);
  return request<void>(`/v2/players/${playerId}/avatar`, { method: "PUT", body: form });
}

// ── social ───────────────────────────────────────────────────────────────

export function addFriend(playerId: number, targetId: number): Promise<void> {
  return request<void>(`/v2/players/${playerId}/friends/${targetId}`, { method: "PUT" });
}

export function removeFriend(playerId: number, targetId: number): Promise<void> {
  return request<void>(`/v2/players/${playerId}/friends/${targetId}`, { method: "DELETE" });
}

export function addFavourite(playerId: number, setId: number): Promise<void> {
  return request<void>(`/v2/players/${playerId}/favourites/${setId}`, { method: "PUT" });
}

export function removeFavourite(playerId: number, setId: number): Promise<void> {
  return request<void>(`/v2/players/${playerId}/favourites/${setId}`, { method: "DELETE" });
}

// ── reads used for live updates ──────────────────────────────────────────

export function fetchServerStats(): Promise<ServerStats> {
  return request<ServerStats>("/v2/server/stats");
}

export function searchPlayers(q: string): Promise<SearchPlayer[]> {
  return request<SearchPlayer[]>(`/v2/players/search?q=${encodeURIComponent(q)}`);
}
