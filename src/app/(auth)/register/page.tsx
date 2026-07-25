import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { Panel } from "@/components/ui/primitives";
import { getCurrentPlayer } from "@/lib/bancho/session";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an account and start playing.",
};

export default async function RegisterPage() {
  if (await getCurrentPlayer()) redirect("/");

  return (
    <Panel className="p-6">
      <h1 className="text-2xl font-black tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-dim">
        One account covers the website and the game. You will use it to sign in to{" "}
        {config.serverName} from the osu! client.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </Panel>
  );
}
