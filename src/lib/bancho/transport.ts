import "server-only";

import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

/**
 * HTTP transport that can override the `Host` header.
 *
 * bancho.py routes its whole API on the `api.{DOMAIN}` Host — see
 * `init_routes` in app/api/init_api.py — so requests to an upstream
 * addressed by IP or by an internal name must still present that host.
 *
 * `fetch` cannot do this: `Host` is a forbidden header name, and undici
 * silently drops it while keeping it visible on the Headers object, which
 * makes the failure look like a mysterious 404 from the upstream. Node's
 * http client has no such restriction, so requests go through it instead.
 */

export interface HostFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: Buffer | Uint8Array | string | null;
  /** Value to send as the `Host` header. */
  hostHeader: string;
  /** Abandon the request after this many milliseconds. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function hostFetch(url: string, options: HostFetchOptions): Promise<Response> {
  const {
    method = "GET",
    headers = {},
    body = null,
    hostHeader,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const target = new URL(url);
  const transport = target.protocol === "https:" ? https : http;

  return new Promise<Response>((resolve, reject) => {
    const outgoing: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && key.toLowerCase() !== "host") outgoing[key] = value;
    }
    outgoing.host = hostHeader;

    const payload =
      body === null ? null : typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
    if (payload !== null) outgoing["content-length"] = payload.byteLength;

    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method,
        headers: outgoing,
        // TLS to the upstream uses its own certificate name, not the
        // overridden Host, so keep SNI aligned with the real hostname
        servername: target.protocol === "https:" ? target.hostname : undefined,
      },
      (response) => {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            for (const item of value) responseHeaders.append(key, item);
          } else {
            responseHeaders.set(key, String(value));
          }
        }

        // 204/304 must not carry a body
        const status = response.statusCode ?? 502;
        const bodyless = status === 204 || status === 304 || method === "HEAD";

        resolve(
          new Response(
            bodyless ? null : (Readable.toWeb(response) as ReadableStream<Uint8Array>),
            {
              status,
              statusText: response.statusMessage ?? "",
              headers: responseHeaders,
            },
          ),
        );
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Upstream request to ${target.pathname} timed out`));
    });
    request.on("error", reject);

    if (payload !== null) request.write(payload);
    request.end();
  });
}
