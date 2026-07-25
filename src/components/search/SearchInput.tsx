"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/components/ui/primitives";

/** Search box on the dedicated search page. Submits to a shareable URL. */
export function SearchInput({ initialTerm }: { initialTerm: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(initialTerm);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
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
        placeholder="Username"
        autoFocus
        className="flex-1"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
