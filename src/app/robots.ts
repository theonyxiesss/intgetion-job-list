import type { MetadataRoute } from "next";
import {
  AI_CRAWLERS,
  BLOCKED_CRAWLERS,
  ROBOTS_DISALLOW,
  siteUrl,
} from "@/modules/seo/site";

/**
 * Crawl public pages only; private areas and the API stay out (D210).
 * SEO-tool and AI-training crawlers are refused the whole site (D218).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] },
      { userAgent: [...BLOCKED_CRAWLERS, ...AI_CRAWLERS], disallow: "/" },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
