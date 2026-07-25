import { MappoolManager } from "@/components/admin/MappoolManager";
import { AdminHeader } from "@/components/admin/shell";
import { getMappools } from "@/lib/bancho/admin";

export default async function AdminMappoolsPage() {
  const pools = await getMappools();

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Mappools"
        title="Tournament pools"
        description="Picks are labelled by their mods and slot, like NM1 or HD2 — the same labels referees use in game with !pool."
      />
      <MappoolManager pools={pools} />
    </div>
  );
}
