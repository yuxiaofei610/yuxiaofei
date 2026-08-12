import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/movie", "/tv", "/anime", "/variety", "/documentary", "/music", "/games/mobile", "/games/online", "/games/single", "/watched", "/played", "/preferences", "/search", "/login", "/register"];
  return routes.map((r) => ({ url: BASE + r, lastModified: new Date() }));
}
