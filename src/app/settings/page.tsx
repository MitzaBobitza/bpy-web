import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvatarForm, PasswordForm, ProfileForm } from "@/components/settings/SettingsForms";
import { getCurrentPlayer } from "@/lib/bancho/session";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, avatar and password.",
};

export default async function SettingsPage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/settings");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Settings</h1>
        <p className="mt-1.5 text-sm text-dim">
          Changes here apply to the game as well as the website.
        </p>
      </header>

      <div className="mt-6 space-y-5">
        <AvatarForm player={player} />
        <ProfileForm player={player} />
        <PasswordForm player={player} />
      </div>
    </div>
  );
}
