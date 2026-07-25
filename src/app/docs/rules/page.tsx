import type { Metadata } from "next";

import { Code, Doc, Note, Section } from "@/components/docs/Doc";
import { config } from "@/lib/config";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Rules",
  description: "What is and is not allowed on the server.",
  path: "/docs/rules",
});

export default function RulesPage() {
  return (
    <Doc
      eyebrow="Community"
      title="Rules"
      intro={`Short version: play fair and be decent to people. Staff enforce these rules and can restrict accounts that break them.`}
    >
      <Section title="Play fair">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            No cheating. Timewarp, relax hacks outside the relax leaderboards, auto-aim, replay
            editing and score submission tools all lead to a restriction.
          </li>
          <li>
            No multi-accounting. One account per person. Boosting a second account&apos;s ranks gets
            both restricted.
          </li>
          <li>
            No exploiting bugs for pp or score. If you find one, report it instead — that is
            genuinely appreciated.
          </li>
        </ul>
        <Note>
          Relax and autopilot have their own separate leaderboards here. Using those mods is not
          cheating; hiding them from the vanilla board is.
        </Note>
      </Section>

      <Section title="Be decent">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>No harassment, hate speech, slurs or targeted abuse in chat or on your profile.</li>
          <li>No impersonating other players or staff.</li>
          <li>Keep usernames, profile text and avatars free of offensive content.</li>
          <li>No advertising or spam in chat channels.</li>
        </ul>
      </Section>

      <Section title="Accounts">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Your account is yours. Do not share or sell it.</li>
          <li>Keep your password to yourself — staff will never ask for it.</li>
          <li>
            Name changes are self-service under{" "}
            <Code>Settings</Code>, but abusive names may be reverted.
          </li>
        </ul>
      </Section>

      <Section title="If something goes wrong">
        <p>
          Restrictions hide your profile and scores from the site while they are in place. If you
          think one was a mistake, contact staff{config.discordInvite ? " on Discord" : ""} and ask
          for a review. Be straightforward — it works much better than arguing.
        </p>
      </Section>
    </Doc>
  );
}
