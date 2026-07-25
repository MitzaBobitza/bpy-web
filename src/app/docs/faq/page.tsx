import type { Metadata } from "next";
import Link from "next/link";

import { Code, Doc, Faq, Section } from "@/components/docs/Doc";
import { config } from "@/lib/config";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description: "Common questions about playing on the server.",
  path: "/docs/faq",
});

export default function FaqPage() {
  return (
    <Doc
      eyebrow="Help"
      title="Frequently asked questions"
      intro="If your question is not here, ask in chat or on Discord."
    >
      <Section title="Playing">
        <Faq
          items={[
            {
              q: "Does playing here affect my official osu! account?",
              a: (
                <p>
                  No. {config.serverName} is completely separate — separate accounts, scores, pp and
                  ranks. Switching back to the official server leaves everything there as it was.
                </p>
              ),
            },
            {
              q: "How do I connect?",
              a: (
                <p>
                  Point the osu! client at {config.domain}. The{" "}
                  <Link href="/docs/connect" className="font-bold">
                    connection guide
                  </Link>{" "}
                  walks through both the server switcher and the launch-flag method.
                </p>
              ),
            },
            {
              q: "Why is my score not showing up?",
              a: (
                <p>
                  Scores only count on beatmaps the server has in its database, and only ranked and
                  approved maps award pp. Unranked, qualified and loved maps still record scores on
                  their own leaderboards.
                </p>
              ),
            },
            {
              q: "What are relax and autopilot boards?",
              a: (
                <p>
                  Playing with the Relax or Autopilot mod submits to a separate leaderboard for that
                  mode, with its own pp and ranks. Pick them from the mode switcher on any profile or
                  ranking page.
                </p>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Account">
        <Faq
          items={[
            {
              q: "How do I change my username, avatar or country?",
              a: (
                <p>
                  All of it lives in{" "}
                  <Link href="/settings" className="font-bold">
                    Settings
                  </Link>
                  . Username and password changes apply to the game immediately.
                </p>
              ),
            },
            {
              q: "I forgot my password.",
              a: (
                <p>
                  Ask staff to reset it. There is no automated email recovery on this server, so keep
                  your password somewhere safe.
                </p>
              ),
            },
            {
              q: "How do clans work?",
              a: (
                <p>
                  A clan gives its members a shared tag in front of their name. Found one
                  under{" "}
                  <Link href="/clans" className="font-bold">
                    Clans
                  </Link>
                  , then invite players by username — they join once they accept. Owners
                  and officers run the clan from that page, or in game with{" "}
                  <Code>!clan</Code>. Players who have never logged in to the game cannot
                  be invited yet.
                </p>
              ),
            },
            {
              q: "Why can I not see a player's profile?",
              a: (
                <p>
                  Restricted accounts, and accounts that have never logged in to the game, are hidden
                  from the site entirely.
                </p>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Beatmaps">
        <Faq
          items={[
            {
              q: "Where do beatmaps come from?",
              a: (
                <p>
                  The server pulls beatmap metadata the first time someone plays a map, so the
                  listing grows as people play. Downloads go through a public mirror, and osu!direct
                  works in game.
                </p>
              ),
            },
            {
              q: "Can I get a map ranked here?",
              a: (
                <p>
                  Maps keep the ranked status they have on the official server. Server nominators can
                  change a map&apos;s status locally, including loving maps that are unranked
                  upstream.
                </p>
              ),
            },
          ]}
        />
      </Section>
    </Doc>
  );
}
