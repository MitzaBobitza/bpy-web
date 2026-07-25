"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addFriend, ApiError, removeFriend } from "@/lib/bancho/client";
import { Button } from "@/components/ui/primitives";

/**
 * Add or remove a friend.
 *
 * bancho.py exposes friendship one-way per request, and only the signed-in
 * player may change their own list — so this is only rendered for other
 * people's profiles while signed in.
 */
export function FriendButton({
  viewerId,
  targetId,
  initiallyFriends,
}: {
  viewerId: number;
  targetId: number;
  initiallyFriends: boolean;
}) {
  const router = useRouter();
  const [friends, setFriends] = useState(initiallyFriends);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (friends) {
        await removeFriend(viewerId, targetId);
        setFriends(false);
      } else {
        await addFriend(viewerId, targetId);
        setFriends(true);
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={friends ? "secondary" : "primary"}
        size="sm"
        onClick={toggle}
        disabled={busy}
        aria-pressed={friends}
      >
        {busy ? "Saving…" : friends ? "Remove friend" : "Add friend"}
      </Button>
      {error ? <span className="text-xs font-semibold text-coral">{error}</span> : null}
    </div>
  );
}
