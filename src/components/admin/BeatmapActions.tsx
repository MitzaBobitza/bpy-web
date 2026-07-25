"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionCard } from "@/components/admin/shell";
import { Alert, Button, Field, Input, Select } from "@/components/ui/primitives";
import { setMapStatus, wipeMapScores } from "@/lib/bancho/admin-client";
import type { AssignableMapStatus, MapStatusScope } from "@/lib/bancho/admin-types";
import { ApiError } from "@/lib/bancho/client";
import { formatNumber } from "@/lib/format";

type Status = { tone: "success" | "error"; message: string } | null;

const STATUSES: { value: AssignableMapStatus; label: string; description: string }[] = [
  { value: "rank", label: "Ranked", description: "Scores award pp" },
  { value: "love", label: "Loved", description: "Scores are kept, but award no pp" },
  { value: "unrank", label: "Unranked", description: "Back to pending" },
];

/**
 * Change a beatmap's ranked status.
 *
 * The map id is entered directly because bancho.py only knows maps that have
 * been played on the server, so there is no catalogue to pick from — staff
 * take the id from the beatmap page or the nomination queue.
 */
export function MapStatusForm({ initialMapId = "" }: { initialMapId?: string }) {
  const router = useRouter();
  const [mapId, setMapId] = useState(initialMapId);
  const [mapStatus, setStatus] = useState<AssignableMapStatus>("rank");
  const [scope, setScope] = useState<MapStatusScope>("map");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Status>(null);

  const parsedId = Number.parseInt(mapId, 10);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(parsedId)) return;

    setBusy(true);
    setResult(null);
    try {
      const change = await setMapStatus(parsedId, mapStatus, scope);
      const count = change.updated_map_ids.length;
      setResult({
        tone: "success",
        message: `Updated ${count} ${count === 1 ? "difficulty" : "difficulties"}.`,
      });
      router.refresh();
    } catch (cause) {
      setResult({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard
      title="Change ranked status"
      description="Also freezes the beatmap, so the next sync with osu! will not revert your decision, and clears it from the nomination queue."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Beatmap id"
          hint="The difficulty id, from its page on this site."
          htmlFor="map-status-id"
        >
          <Input
            id="map-status-id"
            inputMode="numeric"
            value={mapId}
            onChange={(event) => setMapId(event.target.value.replace(/\D/g, ""))}
            placeholder="129891"
            required
          />
        </Field>

        <Field label="New status" htmlFor="map-status-value">
          <Select
            id="map-status-value"
            value={mapStatus}
            onChange={(event) => setStatus(event.target.value as AssignableMapStatus)}
          >
            {STATUSES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label} — {entry.description}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Apply to" htmlFor="map-status-scope">
          <Select
            id="map-status-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as MapStatusScope)}
          >
            <option value="map">This difficulty only</option>
            <option value="set">Every difficulty in the set</option>
          </Select>
        </Field>

        <Button type="submit" size="sm" disabled={busy || !Number.isFinite(parsedId)}>
          {busy ? "Applying…" : "Apply status"}
        </Button>
        {result ? <Alert tone={result.tone}>{result.message}</Alert> : null}
      </form>
    </ActionCard>
  );
}

/** Delete every score on a beatmap. Developer-only, and irreversible. */
export function ScoreWipeForm() {
  const router = useRouter();
  const [mapId, setMapId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Status>(null);

  const parsedId = Number.parseInt(mapId, 10);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(parsedId)) return;

    setBusy(true);
    setResult(null);
    try {
      const wiped = await wipeMapScores(parsedId);
      setResult({
        tone: "success",
        message: `Deleted ${formatNumber(wiped.deleted_scores)} ${
          wiped.deleted_scores === 1 ? "score" : "scores"
        }.`,
      });
      setMapId("");
      setConfirming(false);
      router.refresh();
    } catch (cause) {
      setResult({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard
      title="Wipe a beatmap's scores"
      destructive
      description="Deletes every score ever set on the difficulty, for every player and every mode. There is no undo and no backup."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Beatmap id" htmlFor="wipe-map-id">
          <Input
            id="wipe-map-id"
            inputMode="numeric"
            value={mapId}
            onChange={(event) => {
              setMapId(event.target.value.replace(/\D/g, ""));
              setConfirming(false);
            }}
            placeholder="129891"
            required
          />
        </Field>

        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" variant="danger" disabled={busy}>
              {busy ? "Wiping…" : `Yes, delete every score on ${parsedId}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={!Number.isFinite(parsedId)}
            onClick={() => setConfirming(true)}
          >
            Wipe scores
          </Button>
        )}
        {result ? <Alert tone={result.tone}>{result.message}</Alert> : null}
      </form>
    </ActionCard>
  );
}
