import Link from "next/link";

import { MapStatusForm } from "@/components/admin/BeatmapActions";
import { AdminHeader } from "@/components/admin/shell";
import { StatusBadge } from "@/components/osu/badges";
import { EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { getAdminCapabilities, getMapRequests } from "@/lib/bancho/admin";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";

export default async function AdminBeatmapsPage() {
  const [capabilities, requests] = await Promise.all([
    getAdminCapabilities(),
    getMapRequests(),
  ]);
  if (!capabilities) return null;

  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Beatmaps"
        title="Nominations"
        description="Players request a review in game with !request. Ruling on a map clears every request for it."
      />

      <Panel>
        <PanelHeader title={`Queue · ${formatNumber(requests.length)} beatmaps`} />
        {requests.length === 0 ? (
          <EmptyState
            title="The queue is clear"
            description="Nothing is waiting for a decision."
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {requests.map((request) => (
              <li key={request.map_id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/beatmaps/${request.map_id}`}
                    className="font-bold text-ink transition hover:text-violet"
                  >
                    {request.artist} - {request.title}
                  </Link>
                  <StatusBadge status={request.status} />
                  <span className="font-mono text-[11px] text-faint">#{request.map_id}</span>
                </div>
                <p className="mt-0.5 text-xs text-faint">
                  [{request.version}] · mapped by {request.creator}
                </p>
                <p className="mt-1 text-xs text-dim">
                  {request.request_count}{" "}
                  {request.request_count === 1 ? "request" : "requests"} from{" "}
                  {request.requester_names.join(", ") || "unknown players"} · first asked{" "}
                  {formatDate(request.first_requested_at)}, most recently{" "}
                  {formatRelative(request.last_requested_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section>
        <h2 className="eyebrow">Rule on a beatmap</h2>
        <div className="mt-3 max-w-xl">
          <MapStatusForm />
        </div>
      </section>
    </div>
  );
}
