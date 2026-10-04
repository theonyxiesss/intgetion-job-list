import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW, siteUrl } from "@/modules/seo/site";

/** Crawl public pages only; private areas and the API stay out (D210). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
