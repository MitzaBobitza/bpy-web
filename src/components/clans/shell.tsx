"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import { Alert, Panel } from "@/components/ui/primitives";
import { ApiError } from "@/lib/bancho/client";
import { cn } from "@/lib/cn";
import { clanRankLabel } from "@/lib/osu/privileges";

export type Status = { tone: "success" | "error"; message: string } | null;

/**
 * Runs one clan action, reporting the outcome and refreshing the page so
 * the roster is re-read from the server rather than guessed at.
 */
export function useClanAction() {
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

  return { busy, status, setStatus, run };
}

export function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <div className="mt-3">
      <Alert tone={status.tone}>{status.message}</Alert>
    </div>
  );
}

export function ManageCard({
  title,
  description,
  destructive = false,
  children,
}: {
  title: string;
  description?: string;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <Panel className={cn("p-4", destructive && "border-coral/40")}>
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-faint">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

const RANK_TONES: Record<number, string> = {
  3: "bg-gold/15 text-gold ring-gold/25",
  2: "bg-sky/15 text-sky ring-sky/25",
  1: "bg-surface-3 text-dim ring-line",
};

export function RankChip({ clanPriv }: { clanPriv: number }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-inset",
        RANK_TONES[clanPriv] ?? RANK_TONES[1],
      )}
    >
      {clanRankLabel(clanPriv)}
    </span>
  );
}
