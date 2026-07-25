import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getServerStats } from "@/lib/bancho/api";
import { getCurrentPlayer } from "@/lib/bancho/session";
import { config } from "@/lib/config";

import "./globals.css";

/*
  osu! sets its interface in Torus, which is proprietary. Nunito is the
  closest freely available match — a geometric sans with the same rounded
  terminals and double-storey 'a' — and carries the whole interface.
  JetBrains Mono handles pp, scores and hit counts, where digits need to
  line up in columns.
*/
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const monoData = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-data",
  display: "swap",
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  // share images and canonical urls have to be absolute: a chat app
  // unfurling a link has no page to resolve a relative one against
  metadataBase: new URL(config.siteUrl),
  title: {
    default: `${config.serverName} — osu! private server`,
    template: `%s · ${config.serverName}`,
  },
  description: `Play osu! on ${config.serverName}: your own ranks, leaderboards, beatmap leaderboards and multiplayer.`,
  applicationName: config.serverName,
  openGraph: {
    title: `${config.serverName} — osu! private server`,
    description: `Play osu! on ${config.serverName} with your own ranks and leaderboards.`,
    siteName: config.serverName,
    type: "website",
    locale: "en",
    url: "/",
  },
  twitter: {
    // the wide card, which is also what Discord uses to decide between a
    // thumbnail and a full-width image
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // Discord tints an embed's left edge with this, so it carries the
  // server's accent rather than disappearing into the message background
  themeColor: "#ff66ab",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // resolved once per request and shared by the header
  const [player, stats] = await Promise.all([getCurrentPlayer(), getServerStats()]);

  return (
    <html lang="en" className={`${nunito.variable} ${monoData.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-pink focus:px-3 focus:py-2 focus:font-bold focus:text-void"
        >
          Skip to content
        </a>
        <Header player={player} onlinePlayers={stats?.online_players ?? null} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
