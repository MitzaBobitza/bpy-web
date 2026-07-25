import type { Metadata } from "next";
import Link from "next/link";

import { Block, Code, Doc, Note, Section, Steps } from "@/components/docs/Doc";
import { ButtonLink } from "@/components/ui/primitives";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "How to connect",
  description: "Point your osu! client at the server and start playing.",
};

export default function ConnectPage() {
  const domain = config.domain;

  return (
    <Doc
      eyebrow="Getting started"
      title="Connect osu! to the server"
      intro={`The osu! client talks to whichever server its hostname resolves to. Redirect it at ${domain} and everything — scores, leaderboards, multiplayer and chat — runs here instead of the official server.`}
    >
      <Section title="Before you start">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            An account on {config.serverName}.{" "}
            <Link href="/register" className="font-bold">
              Create one
            </Link>{" "}
            if you have not yet.
          </li>
          <li>A working osu! installation (the stable client).</li>
        </ul>
        <div className="pt-1">
          <ButtonLink href="/register" size="sm">
            Create an account
          </ButtonLink>
        </div>
      </Section>

      <Section title="Windows">
        <Steps
          steps={[
            {
              title: "Get a server switcher",
              body: (
                <p>
                  Download the community osu! server switcher. It patches the client&apos;s
                  certificate handling and rewrites the server hostname for you, which is far less
                  error-prone than editing files by hand.
                </p>
              ),
            },
            {
              title: "Enter the domain",
              body: (
                <p>
                  Run the switcher as administrator, type <Code>{domain}</Code> as the server, and
                  apply. It edits your hosts file and installs the certificate the client needs.
                </p>
              ),
            },
            {
              title: "Sign in",
              body: (
                <p>
                  Start osu! and log in with your {config.serverName} username and password. The
                  chat console will greet you from this server rather than bancho.
                </p>
              ),
            },
          ]}
        />
        <Note>
          If the client says the login failed, check that your password is right here on the site
          first — the website and the game share one account.
        </Note>
      </Section>

      <Section title="Launch flag (no switcher)">
        <p>
          Recent osu! stable builds accept a devserver flag, which avoids touching your hosts file.
          Create a shortcut to <Code>osu!.exe</Code> and append:
        </p>
        <Block>{`osu!.exe -devserver ${domain}`}</Block>
        <p>
          Launch osu! through that shortcut whenever you want to play here, and launch it normally
          to go back to the official server.
        </p>
      </Section>

      <Section title="Linux and macOS">
        <p>
          Under Wine or a Lutris/osu-winello install, pass the same flag to the client&apos;s
          launcher, or set the environment variable before starting osu!:
        </p>
        <Block>{`OSU_SERVER=${domain}\n# or append to the launch command:\n-devserver ${domain}`}</Block>
        <p>
          The exact place to put it depends on your launcher, but it is always the osu! executable
          that needs the flag.
        </p>
      </Section>

      <Section title="Switching back">
        <p>
          Run the server switcher again and reset it to <Code>ppy.sh</Code>, or simply launch osu!
          without the devserver flag. Your official-server account is untouched — the two are
          entirely separate, including scores and pp.
        </p>
      </Section>

      <Section title="What works here">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Score submission, pp, and global and country leaderboards</li>
          <li>Per-beatmap leaderboards, including relax and autopilot boards</li>
          <li>Multiplayer lobbies and in-game chat</li>
          <li>Replays, spectating and osu!direct beatmap downloads</li>
          <li>
            Clan tags beside your name, and <Code>!clan</Code> for managing one in game
          </li>
        </ul>
      </Section>
    </Doc>
  );
}
