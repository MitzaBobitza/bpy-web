"use client";

import { useState } from "react";

import { ActionCard } from "@/components/admin/shell";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { notifyPlayer, sendAnnouncement } from "@/lib/bancho/admin-client";
import { ApiError, searchPlayers } from "@/lib/bancho/client";
import type { SearchPlayer } from "@/lib/bancho/types";

type Status = { tone: "success" | "error"; message: string } | null;

/** Broadcast a notification to everyone currently connected. */
export function BroadcastForm({ onlinePlayers }: { onlinePlayers: number }) {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await sendAnnouncement(message);
      setStatus({
        tone: "success",
        message:
          onlinePlayers > 0
            ? `Sent to ${onlinePlayers} connected ${onlinePlayers === 1 ? "player" : "players"}.`
            : "Sent, though nobody is connected right now.",
      });
      setMessage("");
      setConfirming(false);
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard
      title="Announce to everyone"
      description="Shows a notification in the game client of every connected player. It reaches nobody who is offline, so it cannot be used for lasting notices."
    >
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setConfirming(false);
          }}
          rows={3}
          maxLength={1024}
          required
          placeholder="e.g. Maintenance in 10 minutes — matches will be interrupted."
          aria-label="Announcement"
        />
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Sending…" : "Yes, send to everyone"}
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
            disabled={message.trim() === ""}
            onClick={() => setConfirming(true)}
          >
            Send announcement
          </Button>
        )}
        {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}
      </form>
    </ActionCard>
  );
}

/** Notify one player, found by name. */
export function DirectNotificationForm() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [selected, setSelected] = useState<SearchPlayer | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (term.trim().length < 2) {
      setStatus({ tone: "error", message: "Search needs at least two characters." });
      return;
    }
    try {
      setResults(await searchPlayers(term.trim()));
    } catch {
      setStatus({ tone: "error", message: "Could not search for players." });
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setStatus(null);
    try {
      await notifyPlayer(selected.id, message);
      setStatus({ tone: "success", message: `Sent to ${selected.name}.` });
      setMessage("");
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionCard
      title="Notify one player"
      description="The player must be connected to the game for a notification to arrive."
    >
      <div className="space-y-3">
        <form onSubmit={lookup} className="flex gap-2">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Username"
            aria-label="Player to notify"
          />
          <Button type="submit" size="md" variant="secondary">
            Find
          </Button>
        </form>

        {results.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {results.slice(0, 8).map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => setSelected(result)}
                  aria-pressed={selected?.id === result.id}
                  className={
                    selected?.id === result.id
                      ? "rounded bg-violet px-2 py-1 text-[11px] font-bold text-void"
                      : "rounded bg-surface-3 px-2 py-1 text-[11px] font-semibold text-dim transition hover:bg-line-bright hover:text-ink"
                  }
                >
                  {result.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <form onSubmit={send} className="space-y-3">
          <Field
            label="Message"
            htmlFor="direct-notification"
            hint={selected ? `Will be shown to ${selected.name}.` : "Pick a player first."}
          >
            <Textarea
              id="direct-notification"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              maxLength={1024}
              required
              disabled={!selected}
            />
          </Field>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={busy || !selected || message.trim() === ""}
          >
            {busy ? "Sending…" : "Send notification"}
          </Button>
        </form>

        {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}
      </div>
    </ActionCard>
  );
}
