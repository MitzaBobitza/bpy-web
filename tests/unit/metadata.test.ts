import { describe, expect, it } from "vitest";

import { pageMetadata } from "@/lib/metadata";

describe("page metadata", () => {
  it("repeats the title and description as link-preview tags", () => {
    // Next inherits title and description down the tree but not into
    // openGraph, so a page that set only those would unfurl under the
    // site's own title
    const meta = pageMetadata({
      title: "Rafis",
      description: "Rafis's osu! profile.",
      path: "/u/4",
    });

    expect(meta.openGraph?.title).toBe("Rafis");
    expect(meta.openGraph?.description).toBe("Rafis's osu! profile.");
    expect(meta.twitter?.title).toBe("Rafis");
    expect(meta.twitter?.description).toBe("Rafis's osu! profile.");
  });

  it("points openGraph and the canonical url at the page itself", () => {
    const meta = pageMetadata({
      title: "Clans",
      description: "Every clan.",
      path: "/clans",
    });

    expect(meta.alternates?.canonical).toBe("/clans");
    expect(meta.openGraph).toMatchObject({ url: "/clans" });
  });

  it("omits the canonical url when a page has no stable path", () => {
    const meta = pageMetadata({ title: "Search", description: "Find players." });

    expect(meta.alternates).toBeUndefined();
    expect(meta.openGraph).not.toHaveProperty("url");
  });

  it("names the site card for pages without one of their own", () => {
    // declaring openGraph replaces what the route would inherit from the
    // root, image included, so the fallback has to be explicit
    const meta = pageMetadata({ title: "Rankings", description: "Boards." });

    expect(meta.openGraph).toMatchObject({ images: ["/opengraph-image"] });
  });

  it("leaves the image alone for a route with its own card", () => {
    const meta = pageMetadata({
      title: "Rafis",
      description: "Profile.",
      path: "/u/4",
      image: "own",
    });

    // the colocated opengraph-image file supplies it
    expect(meta.openGraph).not.toHaveProperty("images");
  });

  it("keeps asking for the wide twitter card", () => {
    // a page-level twitter object replaces the root's, and the default
    // "summary" would shrink the image to a thumbnail in Discord
    const meta = pageMetadata({ title: "Rafis", description: "Profile." });

    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("carries the openGraph type through", () => {
    const profile = pageMetadata({
      title: "Rafis",
      description: "Profile.",
      type: "profile",
    });
    expect(profile.openGraph).toMatchObject({ type: "profile" });

    const page = pageMetadata({ title: "Clans", description: "Clans." });
    expect(page.openGraph).toMatchObject({ type: "website" });
  });
});
