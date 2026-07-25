import type { Metadata } from "next";
import Link from "next/link";

import { Doc, Section } from "@/components/docs/Doc";
import { config } from "@/lib/config";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of service",
  description: "The terms you agree to by using the server.",
  path: "/docs/terms",
});

export default function TermsPage() {
  return (
    <Doc
      eyebrow="Legal"
      title="Terms of service"
      intro={`These terms cover your use of ${config.serverName} at ${config.domain}, both the website and the game server.`}
    >
      <Section title="The service">
        <p>
          {config.serverName} is a community-run osu! private server. It is not affiliated with,
          endorsed by, or connected to osu! or ppy Pty Ltd. It is provided free of charge and as-is,
          with no guarantee of availability, and it may change or shut down at any time.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You are responsible for what happens under your account, including keeping your password
          private. One account per person. We may restrict or remove accounts that break the{" "}
          <Link href="/docs/rules" className="font-bold">
            rules
          </Link>
          , with or without notice.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          Anything you put on your profile stays yours, but by posting it you allow us to display it
          on the site. Do not upload content you do not have the right to use, and do not upload
          anything unlawful.
        </p>
      </Section>

      <Section title="Game content">
        <p>
          Beatmaps, the osu! client and osu! branding belong to their respective creators and to ppy
          Pty Ltd. Beatmap downloads are served through third-party mirrors; we do not host or claim
          ownership of that content.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          The service is provided without warranty of any kind. We are not liable for lost scores,
          lost ranks, downtime, or any damage arising from using the server. Your only remedy is to
          stop using it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          These terms can change. Continuing to use the server after a change means you accept the
          updated terms.
        </p>
      </Section>
    </Doc>
  );
}
