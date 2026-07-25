import type { ReactNode } from "react";

/** Shared shell and typography for the help pages. */
export function Doc({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 text-base leading-relaxed text-dim">{intro}</p> : null}
      <div className="mt-8 space-y-8">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      <div className="prose-osu mt-3 space-y-3 text-sm">{children}</div>
    </section>
  );
}

/** Numbered steps, for genuine sequences only. */
export function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span
            className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full border-2 border-pink/60 bg-pink/10 font-mono text-xs font-black text-pink"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-ink">{step.title}</h3>
            <div className="prose-osu mt-1 space-y-2 text-sm">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A copyable snippet, for values people must type exactly. */
export function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-void px-1.5 py-0.5 font-mono text-[13px] text-pink-hi ring-1 ring-inset ring-line">
      {children}
    </code>
  );
}

export function Block({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-void p-3 font-mono text-[13px] leading-relaxed text-dim ring-1 ring-inset ring-line">
      <code>{children}</code>
    </pre>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-md border-l-2 border-pink bg-pink/[0.06] px-4 py-3 text-sm text-dim">
      {children}
    </aside>
  );
}

/** Question and answer pairs. */
export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.q} className="py-4 first:pt-0 last:pb-0">
          <dt className="font-extrabold text-ink">{item.q}</dt>
          <dd className="prose-osu mt-1.5 space-y-2 text-sm">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}
