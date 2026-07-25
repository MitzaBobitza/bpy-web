"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionCard } from "@/components/admin/shell";
import { ModList } from "@/components/osu/badges";
import { Alert, Button, Field, Input, Panel, PanelHeader } from "@/components/ui/primitives";
import {
  addMappoolMap,
  createMappool,
  deleteMappool,
  removeMappoolMap,
} from "@/lib/bancho/admin-client";
import type { MappoolDetail } from "@/lib/bancho/admin-types";
import { ApiError } from "@/lib/bancho/client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { MODS, modsToString } from "@/lib/osu/mods";

type Status = { tone: "success" | "error"; message: string } | null;

/** The mods tournaments actually pool by. */
const PICK_MODS: { label: string; bit: number }[] = [
  { label: "HD", bit: MODS.HIDDEN },
  { label: "HR", bit: MODS.HARDROCK },
  { label: "DT", bit: MODS.DOUBLETIME },
  { label: "FL", bit: MODS.FLASHLIGHT },
  { label: "EZ", bit: MODS.EASY },
  { label: "NC", bit: MODS.NIGHTCORE },
];

export function MappoolManager({ pools }: { pools: MappoolDetail[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);

  function report(tone: "success" | "error", message: string) {
    setStatus({ tone, message });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}

      <div className="max-w-md">
        <CreatePoolForm onDone={report} />
      </div>

      {pools.length === 0 ? (
        <Panel>
          <p className="px-4 py-8 text-center text-sm text-faint">
            No mappools yet. Create one above, or with{" "}
            <code className="font-mono text-pink-hi">!pool create</code> in game.
          </p>
        </Panel>
      ) : (
        <div className="space-y-5">
          {pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} onDone={report} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePoolForm({
  onDone,
}: {
  onDone: (tone: "success" | "error", message: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const pool = await createMappool(name.trim());
      setName("");
      onDone("success", `Created “${pool.name}”.`);
    } catch (cause) {
      onDone("error", cause instanceof ApiError ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard title="New mappool" description="Names are unique, and at most 16 characters.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" htmlFor="pool-name">
          <Input
            id="pool-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
            required
            placeholder="e.g. Winter Cup RO16"
          />
        </Field>
        <Button type="submit" size="sm" disabled={busy || name.trim() === ""}>
          {busy ? "Creating…" : "Create mappool"}
        </Button>
      </form>
    </ActionCard>
  );
}

function PoolCard({
  pool,
  onDone,
}: {
  pool: MappoolDetail;
  onDone: (tone: "success" | "error", message: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await deleteMappool(pool.id);
      onDone("success", `Deleted “${pool.name}”.`);
    } catch (cause) {
      onDone("error", cause instanceof ApiError ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={`${pool.name} · ${pool.maps.length} ${pool.maps.length === 1 ? "pick" : "picks"}`}
        action={
          confirmingDelete ? (
            <span className="flex items-center gap-2">
              <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
                {busy ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
              Delete pool
            </Button>
          )
        }
      />

      <p className="border-b border-line px-4 py-2 text-xs text-faint">
        Created {formatDate(pool.created_at)}
        {pool.created_by_name ? ` by ${pool.created_by_name}` : ""}
      </p>

      {pool.maps.length > 0 ? (
        <ul className="divide-y divide-line/60">
          {pool.maps.map((entry) => (
            <li key={`${entry.mods}-${entry.slot}`} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-16 flex-none font-mono text-xs font-extrabold uppercase text-violet">
                {entry.pick}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/beatmaps/${entry.map_id}`}
                  className="truncate-flex block text-sm font-bold text-ink transition hover:text-violet"
                >
                  {entry.title ? `${entry.artist} - ${entry.title}` : `Beatmap #${entry.map_id}`}
                </Link>
                {entry.version ? (
                  <p className="truncate-flex text-xs text-faint">
                    [{entry.version}] · mapped by {entry.creator}
                  </p>
                ) : null}
              </div>
              <ModList mods={entry.mods} size="sm" />
              <RemovePickButton pool={pool} mods={entry.mods} slot={entry.slot} onDone={onDone} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-faint">No picks yet.</p>
      )}

      <div className="border-t border-line p-4">
        <AddPickForm pool={pool} onDone={onDone} />
      </div>
    </Panel>
  );
}

function RemovePickButton({
  pool,
  mods,
  slot,
  onDone,
}: {
  pool: MappoolDetail;
  mods: number;
  slot: number;
  onDone: (tone: "success" | "error", message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await removeMappoolMap(pool.id, mods, slot);
      onDone("success", `Removed ${modsToString(mods)}${slot} from “${pool.name}”.`);
    } catch (cause) {
      onDone("error", cause instanceof ApiError ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={remove}
      disabled={busy}
      aria-label={`Remove pick ${modsToString(mods)}${slot}`}
    >
      {busy ? "…" : "Remove"}
    </Button>
  );
}

function AddPickForm({
  pool,
  onDone,
}: {
  pool: MappoolDetail;
  onDone: (tone: "success" | "error", message: string) => void;
}) {
  const [mapId, setMapId] = useState("");
  const [mods, setMods] = useState(0);
  const [slot, setSlot] = useState("1");
  const [busy, setBusy] = useState(false);

  const parsedId = Number.parseInt(mapId, 10);
  const parsedSlot = Number.parseInt(slot, 10);
  const valid = Number.isFinite(parsedId) && parsedSlot > 0 && parsedSlot < 100;
  const pick = `${modsToString(mods)}${Number.isFinite(parsedSlot) ? parsedSlot : ""}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await addMappoolMap(pool.id, parsedId, mods, parsedSlot);
      setMapId("");
      onDone("success", `Added ${pick} to “${pool.name}”.`);
    } catch (cause) {
      onDone("error", cause instanceof ApiError ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="eyebrow">Add a pick</p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-36">
          <Field label="Beatmap id" htmlFor={`pool-${pool.id}-map`}>
            <Input
              id={`pool-${pool.id}-map`}
              inputMode="numeric"
              value={mapId}
              onChange={(event) => setMapId(event.target.value.replace(/\D/g, ""))}
              placeholder="129891"
              required
            />
          </Field>
        </div>
        <div className="w-20">
          <Field label="Slot" htmlFor={`pool-${pool.id}-slot`}>
            <Input
              id={`pool-${pool.id}-slot`}
              inputMode="numeric"
              value={slot}
              onChange={(event) => setSlot(event.target.value.replace(/\D/g, ""))}
              required
            />
          </Field>
        </div>
        <div className="flex-1">
          <p className="mb-1 block text-xs font-bold tracking-wide text-dim">Mods</p>
          <div className="flex flex-wrap gap-1">
            {PICK_MODS.map((mod) => {
              const active = (mods & mod.bit) !== 0;
              return (
                <button
                  key={mod.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMods((current) => current ^ mod.bit)}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-black transition",
                    active
                      ? "bg-violet text-void"
                      : "bg-surface-3 text-dim hover:bg-line-bright hover:text-ink",
                  )}
                >
                  {mod.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !valid}>
          {busy ? "Adding…" : "Add pick"}
        </Button>
        <span className="text-xs text-faint">
          Will be labelled <strong className="font-mono text-dim">{pick || "…"}</strong>
        </span>
      </div>
    </form>
  );
}
