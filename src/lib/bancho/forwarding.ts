/**
 * What the upstream is allowed to learn about the caller.
 *
 * bancho.py resolves the client address and the country it records against
 * an account from request headers (`IPResolver` and `_fetch_geoloc_from_headers`
 * in app/state/services.py). Those headers are only meaningful coming from an
 * edge that overwrites them — arriving from a browser they are simply claims,
 * so this proxy states the address itself and drops the caller's version.
 */

/** Headers that belong to a single connection and must not be forwarded. */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
  "content-length",
  // the upstream response is decoded by the transport, so any encoding
  // header from either side would misdescribe the body we forward
  "accept-encoding",
  "content-encoding",
]);

/**
 * Headers the upstream treats as coming from a trusted edge. A caller can
 * set every one of them, so none may be relayed from an inbound request.
 */
const EDGE_CLAIMED = new Set([
  // client address
  "cf-connecting-ip",
  "true-client-ip",
  "x-real-ip",
  "x-forwarded-for",
  // geolocation
  "cf-ipcountry",
  "cf-iplatitude",
  "cf-iplongitude",
  "x-country-code",
  "x-latitude",
  "x-longitude",
]);

/**
 * Build the headers to send upstream for a request from `clientIp`.
 *
 * Everything the caller sent is forwarded except hop-by-hop headers and the
 * edge claims above, which are replaced with what this server observed.
 */
export function forwardableHeaders(
  incoming: Headers,
  clientIp: string,
): Record<string, string> {
  const outgoing: Record<string, string> = {};

  for (const [key, value] of incoming) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || EDGE_CLAIMED.has(lower)) continue;
    outgoing[key] = value;
  }

  // stated by us, not relayed: bancho.py reads X-Real-IP before falling back
  // to the last hop of X-Forwarded-For
  outgoing["x-real-ip"] = clientIp;
  outgoing["x-forwarded-for"] = clientIp;

  return outgoing;
}

export { HOP_BY_HOP };
