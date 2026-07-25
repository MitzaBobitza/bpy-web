"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ApiError, login } from "@/lib/bancho/client";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // only same-site paths are honoured, so a crafted ?next= cannot send
  // someone to another host after signing in
  const rawNext = params.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      router.push(next);
      // re-render server components as the signed-in player
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not sign in. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Field label="Username" htmlFor="login-username">
        <Input
          id="login-username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="login-password">
        <Input
          id="login-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-faint">
        No account yet?{" "}
        <Link href="/register" className="font-bold text-pink transition hover:text-pink-hi">
          Create one
        </Link>
      </p>
    </form>
  );
}
