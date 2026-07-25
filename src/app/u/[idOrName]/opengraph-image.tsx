import { ImageResponse } from "next/og";

import { getPlayer, getPlayerStats } from "@/lib/bancho/api";
import { avatarUrl, config } from "@/lib/config";
import { formatAccuracy, formatNumber, formatPp } from "@/lib/format";
import { modeInfo } from "@/lib/osu/gamemodes";
import {
  inlineImage,
  og,
  OG_CONTENT_TYPE,
  OG_SIZE,
  ogFonts,
  OgFrame,
  OgStat,
  OgWordmark,
  truncate,
} from "@/lib/og";

export const alt = "Player profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A player's card: who they are and where they stand. */
export default async function Image({
  params,
}: {
  params: Promise<{ idOrName: string }>;
}) {
  const { idOrName } = await params;
  const player = await getPlayer(decodeURIComponent(idOrName)).catch(() => null);

  if (!player) {
    return new ImageResponse(
      (
        <OgFrame>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: og.ink }}>
              Player not found
            </div>
            <div style={{ display: "flex", marginTop: 32 }}>
              <OgWordmark />
            </div>
          </div>
        </OgFrame>
      ),
      { ...size, fonts: await ogFonts() },
    );
  }

  const mode = player.preferred_mode ?? 0;
  const [stats, avatar] = await Promise.all([
    getPlayerStats(player.id, mode).catch(() => null),
    inlineImage(avatarUrl(player.id)),
  ]);

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
          <div style={{ display: "flex", alignItems: "center" }}>
            {avatar ? (
              <img
                src={avatar}
                width={168}
                height={168}
                style={{
                  width: 168,
                  height: 168,
                  marginRight: 36,
                  borderRadius: 32,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 168,
                  height: 168,
                  marginRight: 36,
                  borderRadius: 32,
                  backgroundColor: og.surface,
                  fontSize: 76,
                  fontWeight: 800,
                  color: og.pink,
                }}
              >
                {player.name.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 72,
                  fontWeight: 800,
                  color: og.ink,
                  letterSpacing: -1,
                }}
              >
                {truncate(player.name, 18)}
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
                <div
                  style={{
                    display: "flex",
                    marginRight: 14,
                    padding: "6px 14px",
                    borderRadius: 8,
                    backgroundColor: og.surface,
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: 2,
                    color: og.dim,
                  }}
                >
                  {(player.country || "??").toUpperCase()}
                </div>
                <div style={{ display: "flex", fontSize: 28, color: og.faint }}>
                  {modeInfo(mode).fullName}
                </div>
              </div>
            </div>

            {stats?.rank ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  marginLeft: "auto",
                }}
              >
                <div style={{ display: "flex", fontSize: 24, color: og.faint }}>
                  Global rank
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 84,
                    fontWeight: 800,
                    color: og.pink,
                    letterSpacing: -2,
                  }}
                >
                  #{formatNumber(stats.rank)}
                </div>
              </div>
            ) : null}
          </div>

          {/* grade counts, the shape of a profile at a glance */}
          {stats ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              {(
                [
                  ["SS", stats.xh_count + stats.x_count, "#ffd76a"],
                  ["S", stats.sh_count + stats.s_count, "#dfe6ec"],
                  ["A", stats.a_count, "#9ee85a"],
                ] as const
              ).map(([label, count, colour]) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", marginRight: 44 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 62,
                      height: 44,
                      marginRight: 14,
                      borderRadius: 22,
                      backgroundColor: colour,
                      fontSize: 26,
                      fontWeight: 800,
                      color: og.void,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 34,
                      fontWeight: 800,
                      color: og.dim,
                    }}
                  >
                    {formatNumber(count)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {stats ? (
              <>
                <div style={{ display: "flex", marginRight: 72 }}>
                  <OgStat label="Performance" value={`${formatPp(stats.pp)}pp`} />
                </div>
                <div style={{ display: "flex", marginRight: 72 }}>
                  <OgStat label="Accuracy" value={formatAccuracy(stats.acc)} />
                </div>
                <OgStat label="Play count" value={formatNumber(stats.plays)} />
              </>
            ) : (
              <div style={{ display: "flex", fontSize: 32, color: og.faint }}>
                No plays yet on {config.serverName}
              </div>
            )}
            <div style={{ display: "flex", marginLeft: "auto" }}>
              <OgWordmark />
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
