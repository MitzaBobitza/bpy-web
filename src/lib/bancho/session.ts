import "server-only";

import { cookies } from "next/headers";

import { apiGet, SESSION_COOKIE } from "./server";
import type { Player } from "./types";

/**
 * The signed-in player, or `null` when nobody is signed in.
 *
 * The session token is an http-only cookie, so the browser can never read
 * it; identity is always resolved here on the server.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await apiGet<Player>("/v2/sessions/current", { authenticated: true });
  return result?.data ?? null;
}

/** Whether a session cookie is present at all (cheap, no upstream call). */
export async function hasSessionCookie(): Promise<boolean> {
  return (await cookies()).has(SESSION_COOKIE);
}
