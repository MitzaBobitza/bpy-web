"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/primitives";
import { COUNTRY_OPTIONS } from "@/lib/osu/countries";

/**
 * Country filter for the rankings board. Changing it rewrites the URL, so
 * every filtered board stays linkable.
 */
export function CountryFilter({ country }: { country: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function apply(next: string) {
    const search = new URLSearchParams(params.toString());
    if (next) search.set("country", next);
    else search.delete("country");
    // a different board starts from the top
    search.delete("page");
    router.push(`/rankings?${search.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-xs font-bold text-faint">
      Country
      <Select
        value={country}
        onChange={(event) => apply(event.target.value)}
        className="h-8 w-44 text-xs"
        aria-label="Filter rankings by country"
      >
        <option value="">All countries</option>
        {COUNTRY_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
