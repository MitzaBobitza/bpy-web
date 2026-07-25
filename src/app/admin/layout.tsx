import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminCapabilities } from "@/lib/bancho/admin";
import { getCurrentPlayer } from "@/lib/bancho/session";

export const metadata: Metadata = {
  title: "Staff area",
  description: "Server administration.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/admin");

  const capabilities = await getAdminCapabilities();

  // players without any staff privilege get a 404 rather than a refusal:
  // there is no reason to confirm the panel exists to someone who cannot
  // use any part of it
  if (!capabilities?.is_staff) notFound();

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 [&>*]:min-w-0 lg:grid-cols-[15rem_1fr]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <AdminNav capabilities={capabilities} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
