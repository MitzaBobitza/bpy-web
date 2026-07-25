"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/primitives";
import { HitCircle } from "@/components/ui/HitCircle";

/**
 * Catch-all for unexpected render failures. The most likely cause on a
 * self-hosted server is the game server being unreachable, so that is the
 * first thing this suggests checking.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <HitCircle size={72} color="#ff5a5a" />
      <h1 className="mt-6 text-3xl font-black tracking-tight text-ink">Something broke</h1>
      <p className="mt-2 text-sm text-dim">
        This page could not be loaded. If it keeps happening, the game server may be down.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-faint">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" variant="secondary" size="sm">
          Back home
        </ButtonLink>
      </div>
    </div>
  );
}
