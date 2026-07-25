import { BroadcastForm, DirectNotificationForm } from "@/components/admin/AnnouncementForm";
import { AdminHeader } from "@/components/admin/shell";
import { getServerStats } from "@/lib/bancho/api";
import { formatNumber } from "@/lib/format";

export default async function AdminAnnouncementsPage() {
  const stats = await getServerStats();
  const online = stats?.online_players ?? 0;

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Announcements"
        title="Notify players"
        description={`${formatNumber(online)} ${online === 1 ? "player is" : "players are"} connected right now. Notifications only reach connected clients.`}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <BroadcastForm onlinePlayers={online} />
        <DirectNotificationForm />
      </div>
    </div>
  );
}
