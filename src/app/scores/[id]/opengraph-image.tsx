import { ImageResponse } from "next/og";

import { getScore } from "@/lib/bancho/api";
import { beatmapCoverUrl } from "@/lib/config";
import { formatAccuracy, formatNumber, formatPp } from "@/lib/format";
import { gradeStyle } from "@/lib/osu/grades";
import { decomposeMods } from "@/lib/osu/mods";
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

export const alt = "Score";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A single play: who set it, on what, and how well. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const score = await getScore(Number.parseInt(id, 10)).catch(() => null);

  if (!score) {
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
              Score not found
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

  const cover = await inlineImage(beatmapCoverUrl(score.beatmap.set_id, "cover"));
  const grade = gradeStyle(score.grade);
  const mods = decomposeMods(score.mods);

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
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 150,
                height: 150,
                marginRight: 36,
                borderRadius: 30,
                // the grade's own plate, as the site draws it: the colour
                // on GradeStyle is the ink for that gradient, not a fill
                backgroundImage: grade.background,
                fontSize: 80,
                fontWeight: 800,
                color: grade.color,
              }}
            >
              {grade.label}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 800,
                  color: og.ink,
                  letterSpacing: -1,
                }}
              >
                {truncate(score.player.name, 20)}
              </div>
              <div style={{ display: "flex", fontSize: 30, color: og.dim, marginTop: 8 }}>
                {truncate(`${score.beatmap.artist} — ${score.beatmap.title}`, 42)}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: og.faint, marginTop: 6 }}>
                [{truncate(score.beatmap.version, 28)}]
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                marginLeft: "auto",
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: og.faint }}>
                Performance
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
                {formatPp(score.pp)}pp
              </div>
            </div>
          </div>

          {mods.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              {mods.slice(0, 8).map((mod) => (
                <div
                  key={mod.acronym}
                  style={{
                    display: "flex",
                    marginRight: 10,
                    padding: "8px 18px",
                    borderRadius: 10,
                    backgroundColor: og.surface,
                    fontSize: 28,
                    fontWeight: 800,
                    color: og.pink,
                  }}
                >
                  {mod.acronym}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ display: "flex", marginRight: 64 }}>
              <OgStat label="Accuracy" value={formatAccuracy(score.acc)} />
            </div>
            <div style={{ display: "flex", marginRight: 64 }}>
              <OgStat
                label="Combo"
                value={`${formatNumber(score.max_combo)}x`}
                accent={score.perfect ? og.gold : og.ink}
              />
            </div>
            <OgStat label="Misses" value={formatNumber(score.nmiss)} />
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
