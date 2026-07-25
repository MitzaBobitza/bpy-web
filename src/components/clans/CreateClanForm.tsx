"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ManageCard, StatusLine, useClanAction } from "@/components/clans/shell";
import { Button, Field, Input } from "@/components/ui/primitives";
import { createClan } from "@/lib/bancho/clan-client";
import type { Clan } from "@/lib/bancho/clan-types";
import {
  CLAN_NAME_MAX,
  CLAN_TAG_MAX,
  normaliseClanTag,
  validateClanName,
  validateClanTag,
} from "@/lib/osu/clans";

/** Found a clan. The creator becomes its owner, as `!clan create` does. */
export function CreateClanForm() {
  const router = useRouter();
  const { busy, status, run } = useClanAction();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");

  const nameCheck = validateClanName(name);
  const tagCheck = validateClanTag(tag);
  const ready = nameCheck.ok && tagCheck.ok;

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    let created: Clan | null = null;
    const done = await run(async () => {
      created = await createClan(normaliseClanTag(tag), name.trim());
    }, `${name.trim()} founded.`);

    if (done && created) router.push(`/clans/${(created as Clan).id}`);
  }

  return (
    <ManageCard
      title="Found a clan"
      description="You will own it, and its tag will sit in front of your name in game."
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
          <Field
            label="Name"
            htmlFor="new-clan-name"
            error={name.length > 0 && !nameCheck.ok ? nameCheck.error : undefined}
            hint={`Up to ${CLAN_NAME_MAX} characters.`}
          >
            <Input
              id="new-clan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sunset Riders"
              maxLength={CLAN_NAME_MAX}
              required
            />
          </Field>
          <Field
            label="Tag"
            htmlFor="new-clan-tag"
            error={tag.length > 0 && !tagCheck.ok ? tagCheck.error : undefined}
            hint={tag ? `Shown as [${normaliseClanTag(tag)}]` : "Up to 6 characters."}
          >
            <Input
              id="new-clan-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="SUN"
              maxLength={CLAN_TAG_MAX}
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={busy || !ready}>
          Create clan
        </Button>
      </form>
      <StatusLine status={status} />
    </ManageCard>
  );
}
