import { NextResponse } from "next/server";

import { forwardableHeaders, HOP_BY_HOP } from "@/lib/bancho/forwarding";
import { hostFetch } from "@/lib/bancho/transport";
import { serverConfig } from "@/lib/config";

/**
 * Same-origin proxy to bancho.py's API.
 *
 * Three things make this necessary rather than letting the browser call the
 * API directly:
 *
 *  1. bancho.py ships no CORS middleware, so a cross-origin request could
 *     not read the response.
 *  2. Its session cookie is http-only, and keeping the API first-party is
 *     what lets that cookie ride along.
 *  3. The API is only routed on the `api.{DOMAIN}` Host, which a browser
 *     cannot set — see lib/bancho/transport.ts.
 *
 * Proxying also lets the upstream see the visitor's real address through
 * the headers its IP resolver expects.
 */

function clientIp(request: Request): string {
  // a reverse proxy appends the peer to X-Forwarded-For, so its last hop is
  // the only one it vouches for; anything earlier came from the caller
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",").at(-1)?.trim() || "127.0.0.1";
}

/**
 * A cookie marked `Secure` is discarded by browsers on plain http, which
 * would silently break sign-in during local development. Drop the
 * attribute only when this request itself arrived over http.
 */
function adjustCookieSecurity(setCookie: string, isSecureRequest: boolean): string {
  if (isSecureRequest) return setCookie;
  return setCookie
    .split(";")
    .filter((part) => part.trim().toLowerCase() !== "secure")
    .join(";");
}

async function proxy(request: Request, path: string[]): Promise<Response> {
  const url = new URL(request.url);
  const target = `${serverConfig.upstreamUrl}/${path.map(encodeURIComponent).join("/")}${url.search}`;

  const outgoing = forwardableHeaders(request.headers, clientIp(request));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await hostFetch(target, {
      method: request.method,
      headers: outgoing,
      body: hasBody ? Buffer.from(await request.arrayBuffer()) : null,
      hostHeader: serverConfig.upstreamHost,
    });
  } catch {
    return NextResponse.json(
      { status: "error", error: "The game server is not reachable right now." },
      { status: 502 },
    );
  }

  const isSecureRequest =
    url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";

  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "set-cookie") continue;
    responseHeaders.set(key, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", adjustCookieSecurity(cookie, isSecureRequest));
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function POST(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function PUT(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function PATCH(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function DELETE(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
