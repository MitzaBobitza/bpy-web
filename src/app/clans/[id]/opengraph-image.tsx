import { ImageResponse } from "next/og";

import { getClan } from "@/lib/bancho/api";
import { getClanRoster } from "@/lib/bancho/clans";
import { formatDate, formatNumber } from "@/lib/format";
import {
  og,
  OG_CONTENT_TYPE,
  OG_SIZE,
  ogFonts,
  OgFrame,
  OgStat,
  OgWordmark,
  truncate,
} from "@/lib/og";
import { clanRankLabel } from "@/lib/osu/privileges";

export const alt = "Clan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A clan's card: its tag, and who plays under it. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clanId = Number.parseInt(id, 10);
  const clan = await getClan(clanId).catch(() => null);

  if (!clan) {
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
              Clan not found
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

  const members = await getClanRoster(clanId).catch(() => []);

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 168,
                height: 168,
                marginRight: 36,
                borderRadius: 32,
                backgroundColor: "rgba(255,102,171,0.15)",
                border: `4px solid ${og.pinkLo}`,
                fontSize: clan.tag.length > 4 ? 44 : 62,
                fontWeight: 800,
                color: og.pink,
              }}
            >
              {clan.tag}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 24, letterSpacing: 3, color: og.faint }}>
                CLAN
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 72,
                  fontWeight: 800,
                  color: og.ink,
                  letterSpacing: -1,
                  marginTop: 4,
                }}
              >
                {truncate(clan.name, 18)}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: og.faint, marginTop: 8 }}>
                founded {formatDate(clan.created_at)}
              </div>
            </div>
          </div>

          {/* the roster, as far as it fits on one line */}
          {members.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  letterSpacing: 2,
                  color: og.faint,
                  marginBottom: 12,
                }}
              >
                ROSTER
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginRight: 40,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 30,
                        fontWeight: 800,
                        color: og.ink,
                      }}
                    >
                      {truncate(member.name, 13)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 22,
                        color: member.clan_priv === 3 ? og.gold : og.faint,
                      }}
                    >
                      {clanRankLabel(member.clan_priv)}
                    </div>
                  </div>
                ))}
                {members.length > 5 ? (
                  <div style={{ display: "flex", fontSize: 28, color: og.faint }}>
                    +{members.length - 5} more
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ display: "flex", marginRight: 72 }}>
              <OgStat
                label="Members"
                value={formatNumber(members.length)}
                accent={og.pink}
              />
            </div>
            {/* the tag and owner are already on the card, so count the rest */}
            <OgStat
              label="Officers"
              value={formatNumber(
                members.filter((member) => member.clan_priv === 2).length,
              )}
            />
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
