"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Captcha, captchaEnabled } from "@/components/auth/Captcha";
import { ApiError, login, register } from "@/lib/bancho/client";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";

/**
 * The rules bancho.py enforces server-side (see `validate_username` and
 * `validate_password` in app/services/accounts.py). They are stated up
 * front so a rejection is never the first time someone hears about them.
 */
const RULES = {
  username: "2-15 characters. May contain spaces or underscores, but not both.",
  password: "8-32 characters, using more than 3 different characters.",
  email: "Used for account recovery. Never shown on your profile.",
};

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleToken = useCallback((token: string | null) => setCaptchaToken(token), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (captchaEnabled && !captchaToken) {
      setError("Complete the verification challenge first.");
      setBusy(false);
      return;
    }

    try {
      await register({
        username,
        email,
        password,
        captchaToken: captchaToken ?? undefined,
      });
      // registration does not create a session, so sign in straight after
      await login(username, password);
      router.push("/docs/connect");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not create the account. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <Field label="Username" hint={RULES.username} htmlFor="register-username">
        <Input
          id="register-username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          minLength={2}
          maxLength={15}
          required
          autoFocus
        />
      </Field>

      <Field label="Email" hint={RULES.email} htmlFor="register-email">
        <Input
          id="register-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Password" hint={RULES.password} htmlFor="register-password">
        <Input
          id="register-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={32}
          required
        />
      </Field>

      <Captcha onToken={handleToken} />

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-faint">
        By creating an account you agree to the{" "}
        <Link href="/docs/rules" className="font-bold text-dim transition hover:text-pink">
          rules
        </Link>{" "}
        and the{" "}
        <Link href="/docs/terms" className="font-bold text-dim transition hover:text-pink">
          terms of service
        </Link>
        .
      </p>

      <p className="text-center text-sm text-faint">
        Already registered?{" "}
        <Link href="/login" className="font-bold text-pink transition hover:text-pink-hi">
          Sign in
        </Link>
      </p>
    </form>
  );
}
