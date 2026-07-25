import { ScoreWipeForm } from "@/components/admin/BeatmapActions";
import { AdminHeader } from "@/components/admin/shell";
import { Panel } from "@/components/ui/primitives";

export default function AdminMaintenancePage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        eyebrow="Maintenance"
        title="Developer tools"
        description="Destructive operations. Each one is irreversible."
      />

      <div className="max-w-xl">
        <ScoreWipeForm />
      </div>

      <Panel className="p-4">
        <h2 className="text-sm font-extrabold text-ink">Not available here</h2>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          A few of bancho.py&apos;s developer commands have no useful web
          equivalent, so they are deliberately absent rather than faked:
        </p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-dim">
          <li>
            <strong className="text-ink">Recalculating pp</strong> is a long batch
            job. bancho.py ships <code className="font-mono text-pink-hi">tools/recalc.py</code>{" "}
            for it, and its own <code className="font-mono text-pink-hi">!recalc</code>{" "}
            command only points you there.
          </li>
          <li>
            <strong className="text-ink">Shutting down the server</strong> belongs
            to whatever supervises the process — systemd or Docker — not to a
            button on a web page.
          </li>
          <li>
            <strong className="text-ink">Reloading a Python module</strong> and{" "}
            <strong className="text-ink">toggling console debug</strong> act on one
            running process, which is meaningless from a browser and unsafe to
            expose.
          </li>
          <li>
            <strong className="text-ink">Stealth mode</strong> and{" "}
            <strong className="text-ink">forcing a player into a match</strong> only
            mean anything while you are connected in game.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
