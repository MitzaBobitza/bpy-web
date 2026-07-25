import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { serverConfig } from "@/lib/config";

import { hostFetch } from "./transport";
import type { Envelope, Page, SuccessEnvelope } from "./types";

/** Name of the session cookie bancho.py issues (`WEB_SESSION_COOKIE_NAME`). */
export const SESSION_COOKIE = "bancho_session";

export interface UpstreamOptions {
  method?: string;
  body?: Buffer | Uint8Array | string | null;
  headers?: Record<string, string>;
  /**
   * Forward the visitor's session cookie so the upstream resolves them as
   * the acting user, which reveals resources hidden from anonymous callers
   * (their own friends list, or a restricted profile if they are staff).
   */
  authenticated?: boolean;
}

/**
 * Proxy headers bancho.py expects.
 *
 * Its IP resolver reads `CF-Connecting-IP`, or else needs a multi-hop
 * `X-Forwarded-For` alongside an `X-Real-IP` — without one of those,
 * registration fails with a KeyError. See `IPResolver` in
 * app/state/services.py.
 */
export async function proxyHeaders(): Promise<Record<string, string>> {
  const incoming = await headers();
  const forwardedFor = incoming.get("x-forwarded-for");
  const realIp =
    incoming.get("cf-connecting-ip") ??
    incoming.get("x-real-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "127.0.0.1";

  const result: Record<string, string> = {
    "x-forwarded-for": forwardedFor ?? realIp,
    "x-real-ip": realIp,
    accept: "application/json",
  };

  const cfIp = incoming.get("cf-connecting-ip");
  if (cfIp) result["cf-connecting-ip"] = cfIp;
  // bancho.py geolocates new accounts from request headers when it can
  const cfCountry = incoming.get("cf-ipcountry");
  if (cfCountry) result["cf-ipcountry"] = cfCountry;

  return result;
}

/** Perform a request against the bancho.py upstream. */
export async function upstreamFetch(
  path: string,
  options: UpstreamOptions = {},
): Promise<Response> {
  const { method = "GET", body = null, authenticated = false } = options;

  const requestHeaders: Record<string, string> = {
    ...(await proxyHeaders()),
    ...options.headers,
  };

  if (authenticated) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) requestHeaders.cookie = `${SESSION_COOKIE}=${token}`;
  }

  return hostFetch(`${serverConfig.upstreamUrl}${path}`, {
    method,
    body,
    headers: requestHeaders,
    hostHeader: serverConfig.upstreamHost,
  });
}

/**
 * Fetch a JSON envelope, returning `null` when the resource is missing or
 * the upstream is unreachable, so a page can render an empty state rather
 * than failing outright.
 */
async function fetchEnvelope<T>(
  path: string,
  authenticated: boolean,
): Promise<SuccessEnvelope<T> | null> {
  let response: Response;
  try {
    response = await upstreamFetch(path, { authenticated });
  } catch {
    return null;
  }

  let payload: Envelope<T>;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    return null;
  }

  if (payload.status !== "success") return null;
  return payload;
}

/**
 * Memoised for the duration of a single render, so two components asking
 * for the same resource cause one upstream call.
 */
const cachedAnonymous = cache(<T,>(path: string) => fetchEnvelope<T>(path, false));
const cachedAuthenticated = cache(<T,>(path: string) => fetchEnvelope<T>(path, true));

export async function apiGet<T>(
  path: string,
  options: { authenticated?: boolean } = {},
): Promise<SuccessEnvelope<T> | null> {
  return options.authenticated
    ? (cachedAuthenticated(path) as Promise<SuccessEnvelope<T> | null>)
    : (cachedAnonymous(path) as Promise<SuccessEnvelope<T> | null>);
}

/** Fetch a v2 listing, flattening the envelope's pagination metadata. */
export async function apiGetPage<T>(
  path: string,
  options: { authenticated?: boolean } = {},
): Promise<Page<T>> {
  const envelope = await apiGet<T[]>(path, options);
  if (envelope === null) {
    return { items: [], total: 0, page: 1, pageSize: 0 };
  }
  return {
    items: envelope.data,
    total: envelope.meta.total ?? envelope.data.length,
    page: envelope.meta.page ?? 1,
    pageSize: envelope.meta.page_size ?? envelope.data.length,
  };
}

/** Build a query string, dropping empty and undefined values. */
export function query(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}
