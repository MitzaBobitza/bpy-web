import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { Panel } from "@/components/ui/primitives";
import { getCurrentPlayer } from "@/lib/bancho/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account.",
};

export default async function LoginPage() {
  // nobody needs to sign in twice
  if (await getCurrentPlayer()) redirect("/");

  return (
    <Panel className="p-6">
      <h1 className="text-2xl font-black tracking-tight text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-dim">
        Use the same username and password you play with in game.
      </p>
      <div className="mt-6">
        {/* the form reads ?next= from the URL */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </Panel>
  );
}
