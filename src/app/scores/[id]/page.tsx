import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/osu/Avatar";
import { BeatmapCover } from "@/components/osu/BeatmapCover";
import {
  ClanTag,
  CountryFlag,
  DifficultyPill,
  GradeBadge,
  ModList,
  StatusBadge,
} from "@/components/osu/badges";
import { ButtonLink, Panel, PanelHeader } from "@/components/ui/primitives";
import { getScore } from "@/lib/bancho/api";
import type { ScoreDetail } from "@/lib/bancho/types";
import { beatmapDownloadUrl } from "@/lib/config";
import {
  formatAccuracy,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPp,
  formatRelative,
  hitBreakdown,
} from "@/lib/format";
import { difficultyTier, isScoreable } from "@/lib/osu/beatmaps";
import { scoreStatusLabel } from "@/lib/osu/grades";
import { modeInfo, vanillaMode } from "@/lib/osu/gamemodes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const score = await getScore(Number.parseInt(id, 10));
  if (!score) return { title: "Score not found" };
  return {
    title: `${score.player.name} on ${score.beatmap.artist} - ${score.beatmap.title}`,
    description: `${formatAccuracy(score.acc)} for ${formatPp(score.pp)}pp on ${score.beatmap.title} [${score.beatmap.version}].`,
  };
}

export default async function ScorePage({ params }: Props) {
  const { id } = await params;
  const scoreId = Number.parseInt(id, 10);
  if (!Number.isFinite(scoreId)) notFound();

  const score = await getScore(scoreId);
  if (!score) notFound();

  const map = score.beatmap;
  const ruleset = vanillaMode(score.mode);
  const hits = hitBreakdown(score, ruleset);
  const totalHits = hits.reduce((sum, hit) => sum + hit.value, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="overflow-hidden rounded-panel border border-line">
        <BeatmapCover setId={map.set_id} size="cover" className="min-h-40" scrim="heavy">
          <div className="flex min-h-40 flex-col justify-end gap-2 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={map.status} />
              <DifficultyPill stars={map.diff} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-dim">
                {difficultyTier(map.diff)}
              </span>
              <span className="text-[11px] text-faint">{modeInfo(score.mode).fullName}</span>
            </div>
            <Link href={`/beatmaps/${map.id}`} className="group">
              <h1 className="text-xl font-black leading-tight tracking-tight text-ink text-shadow-hero transition group-hover:text-pink sm:text-2xl">
                {map.artist} - {map.title}
              </h1>
            </Link>
            <p className="text-sm text-faint">
              [{map.version}] · mapped by {map.creator}
            </p>
          </div>
        </BeatmapCover>
      </header>

      {/* the result, stated once and large */}
      <section className="mt-5 grid gap-4 [&>*]:min-w-0 sm:grid-cols-[auto_1fr]">
        <div className="panel flex items-center gap-4 px-5 py-4">
          <GradeBadge grade={score.grade} size="lg" />
          <div>
            <p className="font-mono text-3xl font-black leading-none text-pink">
              {formatPp(score.pp)}
              <span className="ml-1 text-base font-bold text-pink-lo">pp</span>
            </p>
            <p className="mt-1 text-xs text-faint">
              {isScoreable(map.status)
                ? scoreStatusLabel(score.status)
                : "This beatmap does not award pp"}
            </p>
          </div>
        </div>

        <dl className="panel grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
          <Metric label="Accuracy" value={formatAccuracy(score.acc)} />
          <Metric label="Score" value={formatNumber(score.score)} />
          <Metric
            label="Max combo"
            value={`${formatNumber(score.max_combo)}x`}
            sub={score.perfect ? "Full combo" : undefined}
          />
          <Metric
            label="Mods"
            value={score.mods ? <ModList mods={score.mods} /> : "None"}
          />
        </dl>
      </section>

      <div className="mt-5 grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Hit breakdown" />
            <div className="space-y-3 px-4 py-4">
              {/*
                One bar per judgement, shares of the same total — a stacked
                proportion, so it is drawn as one bar rather than four.
              */}
              <div className="flex h-3 overflow-hidden rounded-full bg-void">
                {hits.map((hit) =>
                  hit.value > 0 ? (
                    <div
                      key={hit.label}
                      className="h-full border-r-2 border-surface last:border-0"
                      style={{
                        width: `${(hit.value / Math.max(1, totalHits)) * 100}%`,
                        backgroundColor: hit.color,
                      }}
                      title={`${hit.label}: ${formatNumber(hit.value)}`}
                    />
                  ) : null,
                )}
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {hits.map((hit) => (
                  <div key={hit.label} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 flex-none rounded-sm"
                      style={{ backgroundColor: hit.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
                        {hit.label}
                      </dt>
                      <dd className="font-mono text-sm font-bold text-ink">
                        {formatNumber(hit.value)}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Details" />
            <dl className="divide-y divide-line/60">
              <Row label="Set on" value={formatDateTime(score.play_time)} />
              <Row label="Time ago" value={formatRelative(score.play_time)} />
              <Row label="Time played" value={formatDuration(score.time_elapsed / 1000)} />
              <Row label="Submission" value={scoreStatusLabel(score.status)} />
              <Row label="Game mode" value={modeInfo(score.mode).fullName} />
              <Row
                label="Score ID"
                value={<span className="font-mono">{score.id}</span>}
              />
            </dl>
          </Panel>
        </div>

        <div className="space-y-5">
          <PlayerPanel score={score} />

          <Panel>
            <PanelHeader title="Actions" />
            <div className="flex flex-col gap-2 px-4 py-4">
              {/*
                The replay endpoint streams a .osr straight from the API, so
                this is a plain download rather than a fetch.
              */}
              <a
                href={`/bancho/v2/scores/${score.id}/replay`}
                className="inline-flex h-8 items-center justify-center rounded-md bg-pink px-3 text-xs font-bold text-void shadow-[0_2px_14px_rgb(255_102_171/0.28)] transition hover:bg-pink-hi"
              >
                Download replay
              </a>
              <ButtonLink
                href={`/beatmaps/${map.id}`}
                variant="secondary"
                size="sm"
              >
                View leaderboard
              </ButtonLink>
              <a
                href={beatmapDownloadUrl(map.set_id)}
                rel="noreferrer noopener"
                className="inline-flex h-8 items-center justify-center rounded-md text-xs font-bold text-dim transition hover:text-pink"
              >
                Download beatmap
              </a>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Beatmap" />
            <dl className="divide-y divide-line/60">
              <Row label="Star rating" value={`${map.diff.toFixed(2)}★`} />
              <Row label="BPM" value={String(Math.round(map.bpm))} />
              <Row label="Length" value={formatDuration(map.total_length)} />
              <Row label="Max combo" value={`${formatNumber(map.max_combo)}x`} />
              <Row label="CS / AR" value={`${map.cs.toFixed(1)} / ${map.ar.toFixed(1)}`} />
              <Row label="OD / HP" value={`${map.od.toFixed(1)} / ${map.hp.toFixed(1)}`} />
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-extrabold leading-tight text-ink">
        {value || "—"}
      </dd>
      {sub ? <dd className="text-[11px] font-bold text-mint">{sub}</dd> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className="flex-none text-xs text-faint">{label}</dt>
      <dd className="text-right text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

function PlayerPanel({ score }: { score: ScoreDetail }) {
  /*
    The clan tag links to the clan, so it has to sit beside the link to the
    player rather than inside it — an <a> cannot contain another <a>.
  */
  return (
    <Panel>
      <PanelHeader title="Set by" />
      <div className="flex items-center gap-3 px-4 py-4">
        <Link href={`/u/${score.player.id}`} className="flex-none" tabIndex={-1} aria-hidden="true">
          <Avatar playerId={score.player.id} name={score.player.name} size={44} />
        </Link>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <ClanTag clanId={score.player.clan_id} tag={score.player.clan_tag} />
            <Link
              href={`/u/${score.player.id}`}
              className="truncate-flex font-bold text-ink transition hover:text-pink"
            >
              {score.player.name}
            </Link>
          </div>
          <CountryFlag country={score.player.country} showName className="mt-0.5" />
        </div>
      </div>
    </Panel>
  );
}
