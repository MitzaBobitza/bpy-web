"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionCard } from "@/components/admin/shell";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { ApiError } from "@/lib/bancho/client";
import {
  addPlayerNote,
  grantDonor,
  grantPrivileges,
  notifyPlayer,
  restrictPlayer,
  revokePrivileges,
  silencePlayer,
  unrestrictPlayer,
  unsilencePlayer,
} from "@/lib/bancho/admin-client";
import type { AdminCapabilities, PlayerAdminView } from "@/lib/bancho/admin-types";
import { cn } from "@/lib/cn";
import type { DurationPreset } from "@/lib/osu/admin";
import {
  ASSIGNABLE_ROLES,
  describeDuration,
  DONOR_PRESETS,
  DURATION_PRESETS,
  parseDuration,
  STANDARD_REASONS,
} from "@/lib/osu/admin";

type Status = { tone: "success" | "error"; message: string } | null;

/**
 * Runs one admin action, reporting the outcome and refreshing the page so
 * the player's state is re-read from the server rather than guessed at.
 */
function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus({ tone: "success", message: success });
      router.refresh();
      return true;
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Something went wrong.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, run };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div className="mt-3">
      <Alert tone={status.tone}>{status.message}</Alert>
    </div>
  );
}

/** Reason field with the standard reasons bancho.py abbreviates in chat. */
function ReasonField({
  value,
  onChange,
  id,
  label = "Reason",
  hint = "Recorded in the audit log.",
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Field label={label} hint={hint} htmlFor={id}>
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Why is this happening?"
          required
        />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {STANDARD_REASONS.map((preset) => (
          <button
            key={preset.short}
            type="button"
            onClick={() => onChange(preset.reason)}
            className="rounded bg-surface-3 px-2 py-1 text-[11px] font-semibold text-dim transition hover:bg-line-bright hover:text-ink"
          >
            {preset.reason}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Duration field accepting presets or chat-style input like "2h" or "7d". */
function DurationField({
  value,
  onChange,
  id,
  presets = DURATION_PRESETS,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  presets?: DurationPreset[];
}) {
  const seconds = parseDuration(value);

  return (
    <div className="space-y-2">
      <Field
        label="Duration"
        htmlFor={id}
        hint={
          value.trim() === ""
            ? "Write it as 30m, 2h, 7d — or pick one below."
            : seconds === null
              ? undefined
              : `That is ${describeDuration(seconds)}.`
        }
        error={value.trim() !== "" && seconds === null ? "Not a duration." : undefined}
      >
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. 2h"
          required
        />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.input)}
            className="rounded bg-surface-3 px-2 py-1 text-[11px] font-semibold text-dim transition hover:bg-line-bright hover:text-ink"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── notes ─────────────────────────────────────────────────────────────── */

export function AddNoteForm({ player }: { player: PlayerAdminView }) {
  const { busy, status, run } = useAction();
  const [note, setNote] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const saved = await run(() => addPlayerNote(player.id, note), "Note added.");
    if (saved) setNote("");
  }

  return (
    <ActionCard
      title="Add a note"
      description="A private record on this account, visible to staff only."
    >
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={2048}
          required
          placeholder="What should other staff know?"
          aria-label="Note"
        />
        <Button type="submit" size="sm" disabled={busy || note.trim() === ""}>
          {busy ? "Saving…" : "Add note"}
        </Button>
        <StatusLine status={status} />
      </form>
    </ActionCard>
  );
}

/* ── silencing ─────────────────────────────────────────────────────────── */

export function SilenceForm({ player }: { player: PlayerAdminView }) {
  const { busy, status, run } = useAction();
  const [duration, setDuration] = useState("");
  const [reason, setReason] = useState("");

  const seconds = parseDuration(duration);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (seconds === null) return;
    const done = await run(
      () => silencePlayer(player.id, seconds, reason),
      `${player.name} was silenced for ${describeDuration(seconds)}.`,
    );
    if (done) {
      setDuration("");
      setReason("");
    }
  }

  if (player.silenced) {
    return <UnsilenceForm player={player} />;
  }

  return (
    <ActionCard
      title="Silence"
      description="Blocks this player from chat for the duration. They can still play."
    >
      <form onSubmit={submit} className="space-y-3">
        <DurationField id="silence-duration" value={duration} onChange={setDuration} />
        <ReasonField id="silence-reason" value={reason} onChange={setReason} />
        <Button
          type="submit"
          size="sm"
          disabled={busy || seconds === null || reason.trim() === ""}
        >
          {busy ? "Silencing…" : "Silence player"}
        </Button>
        <StatusLine status={status} />
      </form>
    </ActionCard>
  );
}

function UnsilenceForm({ player }: { player: PlayerAdminView }) {
  const { busy, status, run } = useAction();
  const [reason, setReason] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () => unsilencePlayer(player.id, reason),
      `${player.name} was unsilenced.`,
    );
    if (done) setReason("");
  }

  return (
    <ActionCard
      title="Silenced"
      description={`${describeDuration(player.remaining_silence_seconds)} remaining.`}
    >
      <form onSubmit={submit} className="space-y-3">
        <ReasonField id="unsilence-reason" value={reason} onChange={setReason} />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={busy || reason.trim() === ""}
        >
          {busy ? "Lifting…" : "Lift silence"}
        </Button>
        <StatusLine status={status} />
      </form>
    </ActionCard>
  );
}

/* ── restriction ───────────────────────────────────────────────────────── */

export function RestrictionForm({
  player,
  isSelf,
}: {
  player: PlayerAdminView;
  isSelf: boolean;
}) {
  const { busy, status, run } = useAction();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const restricted = player.restricted;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () =>
        restricted
          ? unrestrictPlayer(player.id, reason)
          : restrictPlayer(player.id, reason),
      restricted ? `${player.name} was unrestricted.` : `${player.name} was restricted.`,
    );
    if (done) {
      setReason("");
      setConfirming(false);
    }
  }

  if (isSelf) {
    return (
      <ActionCard title="Restriction" description="You cannot restrict your own account.">
        <p className="text-xs text-faint">
          Ask another administrator if this account needs to be restricted.
        </p>
      </ActionCard>
    );
  }

  return (
    <ActionCard
      title={restricted ? "Restricted" : "Restrict"}
      destructive={!restricted}
      description={
        restricted
          ? "This account and its scores are hidden from the site. Lifting it restores them."
          : "Hides the account and its scores from the site, and disconnects them from the game."
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <ReasonField id="restriction-reason" value={reason} onChange={setReason} />

        {restricted ? (
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={busy || reason.trim() === ""}
          >
            {busy ? "Lifting…" : "Lift restriction"}
          </Button>
        ) : confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" variant="danger" disabled={busy}>
              {busy ? "Restricting…" : `Yes, restrict ${player.name}`}
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
            disabled={reason.trim() === ""}
            onClick={() => setConfirming(true)}
          >
            Restrict player
          </Button>
        )}
        <StatusLine status={status} />
      </form>
    </ActionCard>
  );
}

/* ── privileges ────────────────────────────────────────────────────────── */

export function PrivilegesForm({ player }: { player: PlayerAdminView }) {
  const { busy, status, run } = useAction();
  const [selected, setSelected] = useState<string[]>([]);

  const held = new Set(player.privilege_names);

  function toggle(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((entry) => entry !== name)
        : [...current, name],
    );
  }

  async function apply(grant: boolean) {
    const done = await run(
      () =>
        grant
          ? grantPrivileges(player.id, selected)
          : revokePrivileges(player.id, selected),
      grant ? "Privileges granted." : "Privileges revoked.",
    );
    if (done) setSelected([]);
  }

  return (
    <ActionCard
      title="Privileges"
      description="Privileges are independent — granting developer does not imply moderator. Supporter and premium are set by the donator grant instead."
    >
      <div className="space-y-3">
        <ul className="space-y-1">
          {ASSIGNABLE_ROLES.map((role) => {
            const active = selected.includes(role.name);
            const isHeld = held.has(role.name);
            return (
              <li key={role.name}>
                <button
                  type="button"
                  onClick={() => toggle(role.name)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition",
                    active
                      ? "border-violet/50 bg-violet/10"
                      : "border-line bg-void hover:border-line-bright",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 flex-none place-items-center rounded border text-[10px] font-black",
                      active
                        ? "border-violet bg-violet text-void"
                        : "border-line-bright text-transparent",
                    )}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-ink">{role.label}</span>
                      {isHeld ? (
                        <span className="rounded bg-mint/15 px-1.5 text-[10px] font-bold text-mint">
                          held
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[11px] text-faint">{role.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || selected.length === 0}
            onClick={() => apply(true)}
          >
            {busy ? "Working…" : "Grant selected"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={busy || selected.length === 0}
            onClick={() => apply(false)}
          >
            Revoke selected
          </Button>
        </div>
        <StatusLine status={status} />
      </div>
    </ActionCard>
  );
}

/* ── donator ───────────────────────────────────────────────────────────── */

export function DonorForm({ player }: { player: PlayerAdminView }) {
  const { busy, status, run } = useAction();
  const [duration, setDuration] = useState("");

  const seconds = parseDuration(duration);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (seconds === null) return;
    const done = await run(
      () => grantDonor(player.id, seconds),
      `Added ${describeDuration(seconds)} of donator status.`,
    );
    if (done) setDuration("");
  }

  return (
    <ActionCard
      title="Donator"
      description={
        player.is_donor
          ? "Granting more time extends the existing period rather than replacing it."
          : "Grants supporter alongside an expiry date."
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <DurationField
          id="donor-duration"
          value={duration}
          onChange={setDuration}
          presets={DONOR_PRESETS}
        />
        <Button type="submit" size="sm" disabled={busy || seconds === null}>
          {busy ? "Granting…" : "Grant donator"}
        </Button>
        <StatusLine status={status} />
      </form>
    </ActionCard>
  );
}

/* ── notifications ─────────────────────────────────────────────────────── */

export function NotifyPlayerForm({ player }: { player: PlayerAdminView }) {
  const { busy, status, run } = useAction();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () => notifyPlayer(player.id, message),
      "Notification sent.",
    );
    if (done) setMessage("");
  }

  return (
    <ActionCard
      title="Send a notification"
      description={
        player.is_online
          ? "Shows a message in this player's game client."
          : "This player is offline. Notifications can only reach a connected client."
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
          maxLength={1024}
          required
          placeholder="Message to show in game"
          aria-label="Notification message"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={busy || message.trim() === "" || !player.is_online}
        >
          {busy ? "Sending…" : "Send notification"}
        </Button>
        <StatusLine status={status} />
      </form>
    </ActionCard>
  );
}

/** Everything a staff member may do to this player, gated by capability. */
export function PlayerActionPanels({
  player,
  capabilities,
  isSelf,
}: {
  player: PlayerAdminView;
  capabilities: AdminCapabilities;
  isSelf: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {capabilities.add_notes ? <AddNoteForm player={player} /> : null}
      {capabilities.silence_players ? <SilenceForm player={player} /> : null}
      {capabilities.restrict_players ? (
        <RestrictionForm player={player} isSelf={isSelf} />
      ) : null}
      {capabilities.send_announcements ? <NotifyPlayerForm player={player} /> : null}
      {capabilities.grant_donor ? <DonorForm player={player} /> : null}
      {capabilities.manage_privileges ? <PrivilegesForm player={player} /> : null}
    </div>
  );
}
