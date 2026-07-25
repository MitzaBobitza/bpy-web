import Link from "next/link";
import type { ReactNode } from "react";

import { Panel } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/bancho/admin-types";
import { auditAction } from "@/lib/osu/admin";

/** Page heading for an admin section. */
export function AdminHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-dim">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

/**
 * A single administrative action, with room to explain what it does. Marked
 * `destructive` when it cannot be undone, which tints the border.
 */
export function ActionCard({
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

/** Small labelled value, for the state summaries on a player. */
export function StateChip({
  label,
  tone = "neutral",
  detail,
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  detail?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-dim ring-line-bright",
    good: "bg-mint/15 text-mint ring-mint/30",
    warn: "bg-gold/15 text-gold ring-gold/30",
    bad: "bg-coral/15 text-coral ring-coral/30",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        tones[tone],
      )}
      title={detail}
    >
      {label}
      {detail ? <span className="font-semibold opacity-70">{detail}</span> : null}
    </span>
  );
}

/** The moderation log, rendered as a readable history. */
export function AuditLogList({
  entries,
  showSubject = true,
}: {
  entries: AuditLogEntry[];
  showSubject?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-faint">
        Nothing recorded yet.
      </p>
    );
  }

  const tones = {
    neutral: "text-dim",
    good: "text-mint",
    warn: "text-gold",
    bad: "text-coral",
  } as const;

  return (
    <ul className="divide-y divide-line/60">
      {entries.map((entry) => {
        const action = auditAction(entry.action);
        return (
          <li key={entry.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={cn("text-sm font-extrabold", tones[action.tone])}>
                {action.label}
              </span>
              {showSubject ? (
                <>
                  <span className="text-xs text-faint">on</span>
                  <Link
                    href={`/admin/players/${entry.subject_id}`}
                    className="text-sm font-bold text-ink transition hover:text-violet"
                  >
                    {entry.subject_name ?? `#${entry.subject_id}`}
                  </Link>
                </>
              ) : null}
              <span className="text-xs text-faint">by</span>
              <Link
                href={`/u/${entry.actor_id}`}
                className="text-sm font-semibold text-dim transition hover:text-violet"
              >
                {entry.actor_name ?? `#${entry.actor_id}`}
              </Link>
              <time
                dateTime={entry.created_at}
                title={formatDateTime(entry.created_at)}
                className="ml-auto flex-none text-xs text-faint"
              >
                {formatRelative(entry.created_at)}
              </time>
            </div>
            {entry.message ? (
              <p className="mt-1 break-words text-sm text-dim">{entry.message}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
