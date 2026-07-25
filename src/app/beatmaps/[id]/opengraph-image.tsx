import { ImageResponse } from "next/og";

import { getMap } from "@/lib/bancho/api";
import { beatmapCoverUrl } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { difficultyColor, statusColor, statusLabel } from "@/lib/osu/beatmaps";
import { modeInfo } from "@/lib/osu/gamemodes";
import {
  inlineImage,
  og,
  OG_CONTENT_TYPE,
  OG_SIZE,
  ogFonts,
  OgFrame,
  OgStar,
  OgStat,
  OgWordmark,
  truncate,
} from "@/lib/og";

export const alt = "Beatmap";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A difficulty's card, over its set's cover art. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const map = await getMap(Number.parseInt(id, 10)).catch(() => null);

  if (!map) {
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
              Beatmap not found
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

  const cover = await inlineImage(beatmapCoverUrl(map.set_id, "cover"));
  const stars = map.diff;

  return new ImageResponse(
    (
      <OgFrame cover={cover}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  marginRight: 14,
                  padding: "6px 16px",
                  borderRadius: 8,
                  backgroundColor: statusColor(map.status),
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: og.void,
                  textTransform: "uppercase",
                }}
              >
                {statusLabel(map.status)}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: og.dim }}>
                {modeInfo(map.mode).name}
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 30, color: og.dim }}>
              {truncate(map.artist, 44)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 800,
                color: og.ink,
                letterSpacing: -1,
                marginTop: 2,
              }}
            >
              {truncate(map.title, 30)}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: 16,
                  padding: "6px 18px",
                  borderRadius: 20,
                  backgroundColor: difficultyColor(stars),
                  fontSize: 26,
                  fontWeight: 800,
                  color: stars >= 6.4 ? og.ink : og.void,
                }}
              >
                {stars.toFixed(2)}
                <div style={{ display: "flex", marginLeft: 8 }}>
                  <OgStar size={24} fill={stars >= 6.4 ? og.ink : og.void} />
                </div>
              </div>
              <div style={{ display: "flex", fontSize: 30, color: og.dim }}>
                {truncate(map.version, 32)}
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 26, color: og.faint, marginTop: 12 }}>
              mapped by {truncate(map.creator, 28)}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ display: "flex", marginRight: 64 }}>
              <OgStat label="BPM" value={formatNumber(Math.round(map.bpm))} />
            </div>
            <div style={{ display: "flex", marginRight: 64 }}>
              <OgStat label="Combo" value={`${formatNumber(map.max_combo)}x`} />
            </div>
            <OgStat label="Plays" value={formatNumber(map.plays)} />
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
