import Link from "next/link";

import { HitCircle } from "@/components/ui/HitCircle";
import { config } from "@/lib/config";

/**
 * Shared frame for sign-in and registration: a narrow card, centred, with
 * the site's hit-circle mark standing in for a logo.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:py-16">
      <Link href="/" className="flex flex-col items-center gap-3" aria-label={`${config.serverName} home`}>
        <HitCircle size={56} />
        <span className="text-xl font-black tracking-tight text-ink">{config.serverName}</span>
      </Link>
      <div className="mt-8 w-full">{children}</div>
    </div>
  );
}
