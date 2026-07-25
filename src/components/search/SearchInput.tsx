"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/components/ui/primitives";

/**
 * Player search box. Submits to a shareable URL, so a search can be linked
 * or reloaded. `basePath` lets the staff area reuse it against its own page.
 */
export function SearchInput({
  initialTerm,
  basePath = "/search",
  placeholder = "Username",
}: {
  initialTerm: string;
  basePath?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(initialTerm);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath);
  }

  return (
    <form onSubmit={submit} role="search" className="flex gap-2">
      <label htmlFor="search-term" className="sr-only">
        Username
      </label>
      <Input
        id="search-term"
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        autoFocus
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
