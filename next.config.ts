import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The dev server blocks requests for its own dev resources when they come
   * from an origin it does not recognise, which silently prevents hydration
   * — the page renders but nothing is interactive. Reaching the app by IP
   * rather than by name is normal under WSL, in containers, and when
   * testing from another device on the network, so those hosts are allowed.
   *
   * This has no effect on production builds.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],

  poweredByHeader: false,

  /**
   * Emit a self-contained server bundle in `.next/standalone`, which is what
   * the Dockerfile ships. `next start` keeps working either way, so running
   * on the host directly is unaffected.
   */
  output: "standalone",

  async redirects() {
    return [
      // osu! links profiles as /users/{id}; keep those working
      { source: "/users/:id", destination: "/u/:id", permanent: true },
      { source: "/u", destination: "/search", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // the session cookie is same-site, so refuse to be framed at all
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // nothing here uses a camera, microphone or location
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
