"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/osu/Avatar";
import {
  Alert,
  Button,
  Field,
  Input,
  Panel,
  PanelHeader,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { ApiError, changePassword, updateProfile, uploadAvatar } from "@/lib/bancho/client";
import type { Player } from "@/lib/bancho/types";
import { COUNTRY_OPTIONS } from "@/lib/osu/countries";
import { MODE_LIST } from "@/lib/osu/gamemodes";

/** `users.userpage_content` is a varchar(2048). */
const MAX_USERPAGE = 2048;
/** bancho.py rejects avatars over 2MB. */
const MAX_AVATAR_MB = 2;

type Status = { tone: "success" | "error"; message: string } | null;

/* ── profile ───────────────────────────────────────────────────────────── */

export function ProfileForm({ player }: { player: Player }) {
  const router = useRouter();
  const [username, setUsername] = useState(player.name);
  const [country, setCountry] = useState(player.country);
  const [preferredMode, setPreferredMode] = useState(player.preferred_mode);
  const [userpage, setUserpage] = useState(player.userpage_content ?? "");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);

    // send only what changed; bancho.py leaves omitted fields untouched
    const changes: Parameters<typeof updateProfile>[1] = {};
    if (username !== player.name) changes.username = username;
    if (country !== player.country) changes.country = country;
    if (preferredMode !== player.preferred_mode) changes.preferred_mode = preferredMode;
    if (userpage !== (player.userpage_content ?? "")) {
      changes.userpage_content = userpage.length > 0 ? userpage : null;
    }

    if (Object.keys(changes).length === 0) {
      setStatus({ tone: "success", message: "Nothing to save." });
      setBusy(false);
      return;
    }

    try {
      await updateProfile(player.id, changes);
      setStatus({ tone: "success", message: "Profile saved." });
      router.refresh();
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Could not save the profile.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Profile" />
      <form onSubmit={submit} className="space-y-4 px-4 py-4">
        {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}

        <Field
          label="Username"
          hint="2-15 characters. Changing it also changes the name you sign in with."
          htmlFor="settings-username"
        >
          <Input
            id="settings-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={2}
            maxLength={15}
            required
          />
        </Field>

        <Field label="Country" htmlFor="settings-country">
          <Select
            id="settings-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Default game mode"
          hint="Which mode your profile opens on."
          htmlFor="settings-mode"
        >
          <Select
            id="settings-mode"
            value={preferredMode}
            onChange={(event) => setPreferredMode(Number(event.target.value))}
          >
            {MODE_LIST.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.fullName}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="About me"
          hint={`${userpage.length} / ${MAX_USERPAGE} characters. Shown on your profile.`}
          htmlFor="settings-userpage"
        >
          <Textarea
            id="settings-userpage"
            value={userpage}
            onChange={(event) => setUserpage(event.target.value.slice(0, MAX_USERPAGE))}
            rows={6}
            maxLength={MAX_USERPAGE}
            placeholder="Tell people about yourself."
          />
        </Field>

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Panel>
  );
}

/* ── password ──────────────────────────────────────────────────────────── */

export function PasswordForm({ player }: { player: Player }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);

    if (next !== confirm) {
      setStatus({ tone: "error", message: "The new passwords do not match." });
      return;
    }

    setBusy(true);
    try {
      await changePassword(player.id, current, next);
      setStatus({
        tone: "success",
        message: "Password changed. Use the new one in game as well.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Could not change the password.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="Password" />
      <form onSubmit={submit} className="space-y-4 px-4 py-4">
        {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}

        <Field label="Current password" htmlFor="settings-current-password">
          <Input
            id="settings-current-password"
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <Field
          label="New password"
          hint="8-32 characters, using more than 3 different characters."
          htmlFor="settings-new-password"
        >
          <Input
            id="settings-new-password"
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={32}
            required
          />
        </Field>

        <Field label="Confirm new password" htmlFor="settings-confirm-password">
          <Input
            id="settings-confirm-password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <Button type="submit" disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </Button>
      </form>
    </Panel>
  );
}

/* ── avatar ────────────────────────────────────────────────────────────── */

export function AvatarForm({ player }: { player: Player }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  // bumped after a successful upload so the browser refetches the image
  const [version, setVersion] = useState(0);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(null);

    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setStatus({ tone: "error", message: `Pick an image under ${MAX_AVATAR_MB}MB.` });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      await uploadAvatar(player.id, file);
      setStatus({ tone: "success", message: "Avatar updated." });
      setVersion((value) => value + 1);
      router.refresh();
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof ApiError ? cause.message : "Could not upload the avatar.",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Panel>
      <PanelHeader title="Avatar" />
      <div className="space-y-4 px-4 py-4">
        {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}

        <div className="flex items-center gap-4">
          <span key={version}>
            <Avatar playerId={player.id} name={player.name} size={80} />
          </span>
          <div className="space-y-2">
            <p className="text-sm text-dim">PNG or JPEG, up to {MAX_AVATAR_MB}MB.</p>
            <label className="inline-flex cursor-pointer items-center rounded-md border border-line-bright bg-surface-3 px-3 py-2 text-sm font-bold text-ink transition hover:bg-line-bright">
              {busy ? "Uploading…" : "Choose image"}
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={onChange}
                disabled={busy}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>
    </Panel>
  );
}
