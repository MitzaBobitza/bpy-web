import Link from "next/link";

import { config } from "@/lib/config";

const SECTIONS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Play",
    links: [
      { href: "/docs/connect", label: "How to connect" },
      { href: "/rankings", label: "Rankings" },
      { href: "/beatmaps", label: "Beatmaps" },
      { href: "/multiplayer", label: "Multiplayer" },
      { href: "/tournaments", label: "Tournaments" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/clans", label: "Clans" },
      { href: "/search", label: "Find players" },
      { href: "/docs/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/docs/rules", label: "Rules" },
      { href: "/docs/terms", label: "Terms of service" },
      { href: "/docs/privacy", label: "Privacy policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-void">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-base font-black tracking-tight text-ink">{config.serverName}</p>
          <p className="mt-2 max-w-xs text-sm text-faint">
            A private osu! server. Play with your own ranks, leaderboards and friends.
          </p>
          {config.discordInvite ? (
            <a
              href={config.discordInvite}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-pink transition hover:text-pink-hi"
            >
              Join our Discord
              <span aria-hidden="true">→</span>
            </a>
          ) : null}
        </div>

        {SECTIONS.map((section) => (
          <nav key={section.title}>
            <h2 className="eyebrow">{section.title}</h2>
            <ul className="mt-3 space-y-1.5">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-dim transition hover:text-pink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            Running on{" "}
            <a
              href="https://github.com/osuAkatsuki/bancho.py"
              target="_blank"
              rel="noreferrer noopener"
              className="font-bold text-dim transition hover:text-pink"
            >
              bancho.py
            </a>
            . Not affiliated with osu! or ppy Pty Ltd.
          </p>
          <p>{config.domain}</p>
        </div>
      </div>
    </footer>
  );
}
