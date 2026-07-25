import Link from "next/link";

import { HeroPattern } from "@/components/home/HeroPattern";
import { Avatar } from "@/components/osu/Avatar";
import { ClanTag, CountryFlag, DifficultyPill, GradeBadge, ModList } from "@/components/osu/badges";
import { ButtonLink, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import {
  getLeaderboard,
  getMaps,
  getPlayerScores,
  getScores,
  getServerStats,
} from "@/lib/bancho/api";
import type { LeaderboardEntry, PlayerScore } from "@/lib/bancho/types";
import { config } from "@/lib/config";
import {
  formatAccuracy,
  formatCompact,
  formatNumber,
  formatPp,
  formatRelative,
  toDate,
} from "@/lib/format";

/** How many top players feed the "latest plays" strip. */
const FEED_PLAYERS = 8;

export default async function HomePage() {
  const [stats, topPlayers, mapCount, scoreCount] = await Promise.all([
    getServerStats(),
    getLeaderboard({ mode: 0, sort: "pp", pageSize: 10 }),
    getMaps({ pageSize: 1 }),
    getScores({ pageSize: 1 }),
  ]);

  // bancho.py has no server-wide "recent scores" endpoint — its global score
  // listing is unordered — so the feed is drawn from the players at the top
  // of the leaderboard, whose own score lists are ordered by play time.
  const recentByPlayer = await Promise.all(
    topPlayers.slice(0, FEED_PLAYERS).map(async (entry) => {
      const scores = await getPlayerScores(entry.player_id, {
        scope: "recent",
        mode: 0,
        limit: 2,
        includeFailed: false,
      });
      return scores.map((score) => ({ score, player: entry }));
    }),
  );

  const latestPlays = recentByPlayer
    .flat()
    .sort(
      (a, b) =>
        (toDate(b.score.play_time)?.getTime() ?? 0) - (toDate(a.score.play_time)?.getTime() ?? 0),
    )
    .slice(0, 6);

  return (
    <>
      <Hero online={stats?.online_players ?? null} />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <GlanceStrip
          online={stats?.online_players ?? null}
          registered={stats?.total_players ?? null}
          beatmaps={mapCount.total}
          scores={scoreCount.total}
        />

        <div className="grid gap-8 [&>*]:min-w-0 lg:grid-cols-[1.1fr_1fr]">
          <TopPlayers entries={topPlayers} />
          <LatestPlays plays={latestPlays} />
        </div>

        <GetStarted />
      </div>
    </>
  );
}

/* ── hero ──────────────────────────────────────────────────────────────── */

function Hero({ online }: { online: number | null }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(70% 90% at 78% 40%, rgb(255 102 171 / 0.16), transparent 70%)," +
            "radial-gradient(60% 70% at 10% 90%, rgb(167 139 250 / 0.10), transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:py-20">
        <div className="animate-fade-up">
          <p className="eyebrow">osu! private server</p>
          <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-tighter text-ink text-shadow-hero sm:text-6xl lg:text-7xl">
            Click circles.
            <br />
            <span className="text-pink">Climb the board.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-dim">
            {config.serverName} is a fully featured osu! server with its own ranks, beatmap
            leaderboards and multiplayer. Bring your own client and start over from #1.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink href="/register" size="lg">
              Create your account
            </ButtonLink>
            <ButtonLink href="/docs/connect" variant="secondary" size="lg">
              How to connect
            </ButtonLink>
          </div>

          {online !== null ? (
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-faint">
              <span className="h-2 w-2 rounded-full bg-mint animate-live" aria-hidden="true" />
              <strong className="font-extrabold text-ink">{formatNumber(online)}</strong>
              {online === 1 ? "player" : "players"} online right now
            </p>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-sm lg:max-w-none">
          <HeroPattern />
        </div>
      </div>
    </section>
  );
}

/* ── stats ─────────────────────────────────────────────────────────────── */

function GlanceStrip({
  online,
  registered,
  beatmaps,
  scores,
}: {
  online: number | null;
  registered: number | null;
  beatmaps: number;
  scores: number;
}) {
  const items = [
    { label: "Online now", value: online === null ? "–" : formatNumber(online) },
    { label: "Registered players", value: registered === null ? "–" : formatNumber(registered) },
    { label: "Beatmaps tracked", value: formatCompact(beatmaps) },
    { label: "Scores submitted", value: formatCompact(scores) },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="panel px-4 py-3">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
            {item.label}
          </dt>
          <dd className="mt-1 font-mono text-2xl font-extrabold text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── leaderboard preview ───────────────────────────────────────────────── */

function TopPlayers({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Top players · osu!"
        action={
          <Link
            href="/rankings"
            className="text-xs font-bold text-pink transition hover:text-pink-hi"
          >
            Full rankings →
          </Link>
        }
      />
      {entries.length === 0 ? (
        <EmptyState
          title="No ranked players yet"
          description="Play a few maps and the leaderboard will fill up."
        />
      ) : (
        <ol>
          {entries.map((entry) => (
            <li
              key={entry.player_id}
              className="flex items-center gap-3 border-b border-line/60 px-4 py-2.5 last:border-0"
            >
              <span
                className={
                  entry.rank <= 3
                    ? "w-8 flex-none font-mono text-sm font-extrabold text-pink"
                    : "w-8 flex-none font-mono text-sm font-bold text-faint"
                }
              >
                #{entry.rank}
              </span>
              <Avatar playerId={entry.player_id} name={entry.name} size={32} />
              <CountryFlag country={entry.country} />
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <ClanTag clanId={entry.clan_id} tag={entry.clan_tag} />
                <Link
                  href={`/u/${entry.player_id}`}
                  className="truncate-flex font-bold text-ink transition hover:text-pink"
                >
                  {entry.name}
                </Link>
              </div>
              <span className="hidden text-xs text-faint sm:block">
                {formatAccuracy(entry.acc)}
              </span>
              <span className="w-16 flex-none text-right font-mono text-sm font-extrabold text-pink">
                {formatPp(entry.pp)}
                <span className="ml-0.5 text-[11px] text-pink-lo">pp</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ── recent plays ──────────────────────────────────────────────────────── */

function LatestPlays({
  plays,
}: {
  plays: { score: PlayerScore; player: LeaderboardEntry }[];
}) {
  return (
    <Panel>
      <PanelHeader title={`Latest plays · top ${FEED_PLAYERS}`} />
      {plays.length === 0 ? (
        <EmptyState title="No plays yet" description="Scores appear here as they are submitted." />
      ) : (
        <ul>
          {plays.map(({ score, player }) => (
            <li key={score.id} className="border-b border-line/60 last:border-0">
              <Link
                href={`/scores/${score.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2"
              >
                <GradeBadge grade={score.grade} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate-flex text-sm font-bold text-ink">
                      {score.beatmap
                        ? `${score.beatmap.artist} - ${score.beatmap.title}`
                        : "Deleted beatmap"}
                    </span>
                    {score.beatmap ? <DifficultyPill stars={score.beatmap.diff} /> : null}
                  </div>
                  <p className="truncate-flex text-xs text-faint">
                    <span className="font-bold text-dim">{player.name}</span>
                    {" · "}
                    {formatAccuracy(score.acc)}
                    {" · "}
                    {formatRelative(score.play_time)}
                  </p>
                </div>
                <ModList mods={score.mods} size="sm" className="hidden sm:flex" />
                <span className="flex-none font-mono text-sm font-extrabold text-pink">
                  {formatPp(score.pp)}
                  <span className="ml-0.5 text-[11px] text-pink-lo">pp</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── onboarding ────────────────────────────────────────────────────────── */

function GetStarted() {
  const steps = [
    {
      title: "Make an account",
      body: "Pick a username and password here on the site. It takes a few seconds.",
      href: "/register",
      cta: "Register",
    },
    {
      title: "Point osu! at the server",
      body: `Run the osu! client against ${config.domain} using a server switcher or a launch flag.`,
      href: "/docs/connect",
      cta: "Read the guide",
    },
    {
      title: "Start submitting scores",
      body: "Every pass counts towards your pp, your country rank and the beatmap leaderboards.",
      href: "/rankings",
      cta: "See the rankings",
    },
  ];

  return (
    <section>
      <h2 className="eyebrow">Getting started</h2>
      {/* the three steps are a genuine sequence, so they are numbered */}
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="panel flex flex-col gap-2 p-5">
            <span className="font-mono text-xs font-extrabold text-pink">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-lg font-extrabold text-ink">{step.title}</h3>
            <p className="flex-1 text-sm leading-relaxed text-dim">{step.body}</p>
            <Link
              href={step.href}
              className="mt-1 text-sm font-bold text-pink transition hover:text-pink-hi"
            >
              {step.cta} →
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
