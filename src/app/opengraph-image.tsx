import { ImageResponse } from "next/og";

import { getServerStats } from "@/lib/bancho/api";
import { config } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { og, OG_CONTENT_TYPE, OG_SIZE, ogFonts, OgFrame, OgStat } from "@/lib/og";

export const alt = `${config.serverName} — an osu! private server`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** The card shown for the site itself, and for any page without its own. */
export default async function Image() {
  const stats = await getServerStats().catch(() => null);

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          {/* a hit circle, oversized and bled off the right edge */}
          <div
            style={{
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              top: 96,
              right: -150,
              width: 440,
              height: 440,
              borderRadius: 220,
              border: `26px solid ${og.pinkLo}`,
              opacity: 0.55,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 250,
                height: 250,
                borderRadius: 125,
                border: `18px solid ${og.pinkLo}`,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 64,
                  marginRight: 22,
                  borderRadius: 32,
                  border: `10px solid ${og.pink}`,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 82,
                  fontWeight: 800,
                  color: og.ink,
                  letterSpacing: -2,
                }}
              >
                {config.serverName}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 34, color: og.dim, marginTop: 18 }}>
              A private osu! server — your own ranks,
            </div>
            <div style={{ display: "flex", fontSize: 34, color: og.dim, marginTop: 4 }}>
              leaderboards and friends.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {stats ? (
              <div style={{ display: "flex", marginRight: 80 }}>
                <OgStat
                  label="Players"
                  value={formatNumber(stats.total_players)}
                  accent={og.pink}
                />
              </div>
            ) : null}
            {stats ? (
              <OgStat label="Online now" value={formatNumber(stats.online_players)} />
            ) : null}
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                fontSize: 30,
                fontWeight: 800,
                color: og.faint,
              }}
            >
              {config.domain}
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
