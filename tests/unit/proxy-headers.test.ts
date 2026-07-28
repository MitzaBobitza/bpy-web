import { describe, expect, it } from "vitest";

import { forwardableHeaders } from "@/lib/bancho/forwarding";

/**
 * The proxy decides what the upstream is told about the caller. bancho.py
 * reads the client address and geolocation out of edge headers, so anything
 * a browser can set must not survive the hop.
 */
describe("forwardableHeaders", () => {
  it("keeps the headers the upstream needs", () => {
    const out = forwardableHeaders(
      new Headers({ cookie: "bancho_session=abc", "content-type": "application/json" }),
      "198.51.100.4",
    );

    expect(out.cookie).toBe("bancho_session=abc");
    expect(out["content-type"]).toBe("application/json");
  });

  it("states the caller's address itself", () => {
    const out = forwardableHeaders(new Headers(), "198.51.100.4");

    expect(out["x-real-ip"]).toBe("198.51.100.4");
    expect(out["x-forwarded-for"]).toBe("198.51.100.4");
  });

  it("drops a spoofed cloudflare address", () => {
    // read first by bancho.py's IPResolver, so passing it through would let
    // the caller name any address they like
    const out = forwardableHeaders(new Headers({ "cf-connecting-ip": "203.0.113.99" }), "10.0.0.5");

    expect(out["cf-connecting-ip"]).toBeUndefined();
    expect(out["x-real-ip"]).toBe("10.0.0.5");
  });

  it("drops spoofed geolocation headers", () => {
    const out = forwardableHeaders(
      new Headers({
        "cf-ipcountry": "JP",
        "cf-iplatitude": "35.6895",
        "cf-iplongitude": "139.6917",
        "x-country-code": "JP",
        "x-latitude": "35.6895",
        "x-longitude": "139.6917",
      }),
      "10.0.0.5",
    );

    for (const header of [
      "cf-ipcountry",
      "cf-iplatitude",
      "cf-iplongitude",
      "x-country-code",
      "x-latitude",
      "x-longitude",
    ]) {
      expect(out[header]).toBeUndefined();
    }
  });

  it("does not let the caller prepend a hop to x-forwarded-for", () => {
    const out = forwardableHeaders(
      new Headers({ "x-forwarded-for": "203.0.113.99" }),
      "198.51.100.4",
    );

    expect(out["x-forwarded-for"]).toBe("198.51.100.4");
  });

  it("drops hop-by-hop headers", () => {
    const out = forwardableHeaders(
      new Headers({ connection: "keep-alive", host: "evil.example", te: "trailers" }),
      "10.0.0.5",
    );

    expect(out.connection).toBeUndefined();
    expect(out.host).toBeUndefined();
    expect(out.te).toBeUndefined();
  });
});
