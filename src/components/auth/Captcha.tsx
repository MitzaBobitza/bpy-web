"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { config } from "@/lib/config";

/**
 * Captcha widget for registration.
 *
 * bancho.py verifies the token server-side against whichever provider the
 * operator configured (`CAPTCHA_PROVIDER`), and skips verification entirely
 * when none is set — so this renders nothing unless a provider and site key
 * are configured here to match.
 */

const SCRIPTS: Record<string, string> = {
  recaptcha: "https://www.google.com/recaptcha/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit",
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
};

/** Each provider exposes the same explicit-render surface under its own global. */
const GLOBALS: Record<string, string> = {
  recaptcha: "grecaptcha",
  hcaptcha: "hcaptcha",
  turnstile: "turnstile",
};

type CaptchaApi = {
  render: (
    container: HTMLElement,
    options: { sitekey: string; theme?: string; callback?: (token: string) => void; "expired-callback"?: () => void },
  ) => string | number;
};

export const captchaEnabled = Boolean(config.captcha.provider && config.captcha.siteKey);

export function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const provider = config.captcha.provider;

  useEffect(() => {
    if (!scriptReady || renderedRef.current || !containerRef.current || !provider) return;

    const api = (window as unknown as Record<string, CaptchaApi | undefined>)[GLOBALS[provider]];
    if (!api?.render) return;

    renderedRef.current = true;
    api.render(containerRef.current, {
      sitekey: config.captcha.siteKey,
      theme: "dark",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
    });
  }, [scriptReady, provider, onToken]);

  if (!captchaEnabled || !provider) return null;

  return (
    <div>
      <Script src={SCRIPTS[provider]} onLoad={() => setScriptReady(true)} strategy="lazyOnload" />
      <div ref={containerRef} />
      {!scriptReady ? <p className="text-xs text-faint">Loading verification…</p> : null}
    </div>
  );
}
