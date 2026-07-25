import type { Metadata } from "next";

/**
 * Page metadata with matching link-preview tags.
 *
 * Next inherits `title` and `description` down the tree, but not into
 * `openGraph` — a page that sets only those two would be unfurled by a chat
 * app under the site's own title. This keeps the two in step, so every
 * shared link describes the page it actually points at.
 *
 * The share image itself comes from the `opengraph-image` file colocated
 * with the route, and needs no wiring here.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  image = "site",
}: {
  title: string;
  description: string;
  /** Absolute path of the page, e.g. `/u/1234`, for a canonical url. */
  path?: string;
  type?: "website" | "article" | "profile";
  /**
   * Which share image to point at.
   *
   * `"own"` is for a route with its own `opengraph-image` file, which Next
   * attaches by itself. `"site"` names the site-wide card explicitly,
   * because declaring `openGraph` here replaces what the route would
   * otherwise inherit from the root — including its image.
   */
  image?: "site" | "own";
}): Metadata {
  return {
    title,
    description,
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      title,
      description,
      type,
      ...(path ? { url: path } : {}),
      ...(image === "site" ? { images: ["/opengraph-image"] } : {}),
    },
    twitter: {
      // repeated rather than inherited for the same reason as the image:
      // a page-level twitter object replaces the root's, and dropping to
      // the default "summary" would shrink the card to a thumbnail
      card: "summary_large_image",
      title,
      description,
    },
  };
}
