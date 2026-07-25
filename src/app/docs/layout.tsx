import { DocsNav } from "@/components/layout/DocsNav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 [&>*]:min-w-0 lg:grid-cols-[15rem_1fr]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <DocsNav />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
