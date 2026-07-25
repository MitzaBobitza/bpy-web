import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ── panel ─────────────────────────────────────────────────────────────── */

export function Panel({
  className,
  children,
  ...rest
}: ComponentProps<"section"> & { children: ReactNode }) {
  return (
    <section className={cn("panel", className)} {...rest}>
      {children}
    </section>
  );
}

/** Panel header with an eyebrow label and optional trailing controls. */
export function PanelHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b border-line px-4 py-3",
        className,
      )}
    >
      <h2 className="eyebrow">{title}</h2>
      {action}
    </header>
  );
}

/* ── button ────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-bold transition " +
  "disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-pink text-void hover:bg-pink-hi active:bg-pink-lo shadow-[0_2px_14px_rgb(255_102_171/0.28)]",
  secondary: "bg-surface-3 text-ink hover:bg-line-bright border border-line-bright",
  ghost: "text-dim hover:text-ink hover:bg-surface-2",
  danger: "bg-coral/15 text-coral hover:bg-coral/25 border border-coral/40",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...rest}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...rest}
    />
  );
}

/* ── form fields ───────────────────────────────────────────────────────── */

const FIELD_BASE =
  "w-full rounded-md border border-line bg-void px-3 text-sm text-ink placeholder:text-faint " +
  "transition focus:border-pink focus:outline-none disabled:opacity-50";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(FIELD_BASE, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD_BASE, "py-2 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(FIELD_BASE, "h-10 pr-8", className)} {...rest} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-bold tracking-wide text-dim">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-coral">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── feedback ──────────────────────────────────────────────────────────── */

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "border-coral/40 bg-coral/10 text-coral",
    success: "border-mint/40 bg-mint/10 text-mint",
    info: "border-sky/40 bg-sky/10 text-sky",
  } as const;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2 text-sm font-semibold", tones[tone])}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div
        className="h-10 w-10 rounded-full border-2 border-dashed border-line-bright"
        aria-hidden="true"
      />
      <p className="font-bold text-dim">{title}</p>
      {description ? <p className="max-w-sm text-sm text-faint">{description}</p> : null}
      {action}
    </div>
  );
}

/* ── labels & stats ────────────────────────────────────────────────────── */

export function Chip({
  className,
  children,
  ...rest
}: ComponentProps<"span"> & { children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold",
        "bg-surface-3 text-dim",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** A label/value pair, as used across profile and beatmap panels. */
export function Stat({
  label,
  value,
  sub,
  align = "left",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <div className={cn(align === "right" && "text-right", align === "center" && "text-center")}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 text-lg font-extrabold leading-tight text-ink">{value}</dd>
      {sub ? <dd className="text-xs text-faint">{sub}</dd> : null}
    </div>
  );
}
