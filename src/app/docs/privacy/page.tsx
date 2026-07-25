import type { Metadata } from "next";
import Link from "next/link";

import { Doc, Section } from "@/components/docs/Doc";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What data the server stores and why.",
};

export default function PrivacyPage() {
  return (
    <Doc
      eyebrow="Legal"
      title="Privacy policy"
      intro={`What ${config.serverName} stores about you, why, and what you can do about it.`}
    >
      <Section title="What we store">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account details</strong> — your username, email address and a hashed password.
            Passwords are stored as bcrypt hashes and cannot be read back.
          </li>
          <li>
            <strong>Gameplay data</strong> — your scores, replays, statistics, ranks, friends and
            favourite beatmaps.
          </li>
          <li>
            <strong>Connection data</strong> — IP addresses and hardware identifiers reported by the
            osu! client at login. These are used to detect multi-accounting and cheating.
          </li>
          <li>
            <strong>Country</strong> — derived from your IP address on registration, and shown on
            your profile and the country leaderboards.
          </li>
        </ul>
      </Section>

      <Section title="What is public">
        <p>
          Your username, country, avatar, profile text, statistics, scores and replays are visible to
          anyone. Your email address, password and connection data are not.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Signing in sets one cookie that holds your session token. It is marked http-only, so
          scripts in your browser cannot read it, and it expires after 30 days or when you sign out.
          There are no advertising or analytics cookies.
        </p>
      </Section>

      <Section title="Third parties">
        <p>
          Beatmap cover art loads from osu!&apos;s asset servers, and beatmap downloads go through a
          public mirror — those requests reach the respective operators. Registration may use a
          captcha provider to block automated sign-ups. Nothing else is shared, and your data is
          never sold.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can change your username, country, avatar and profile text at any time in{" "}
          <Link href="/settings" className="font-bold">
            Settings
          </Link>
          . To have your account and its data deleted, contact staff
          {config.discordInvite ? " on Discord" : ""} and ask. Some records may be retained where
          needed to enforce restrictions.
        </p>
      </Section>
    </Doc>
  );
}
