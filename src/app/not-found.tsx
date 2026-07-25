import Link from "next/link";

import { HitCircle } from "@/components/ui/HitCircle";
import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <HitCircle size={72} number={4} />
      <h1 className="mt-6 text-3xl font-black tracking-tight text-ink">Nothing here</h1>
      <p className="mt-2 text-sm text-dim">
        This page, player or beatmap does not exist. It may have been removed, or the player may be
        restricted.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/" size="sm">
          Back home
        </ButtonLink>
        <ButtonLink href="/rankings" variant="secondary" size="sm">
          Rankings
        </ButtonLink>
      </div>
      <p className="mt-6 text-xs text-faint">
        Looking for someone?{" "}
        <Link href="/search" className="font-bold text-pink hover:text-pink-hi">
          Search for players
        </Link>
      </p>
    </div>
  );
}
