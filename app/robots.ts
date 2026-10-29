import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/documents",
          "/profil",
          "/konto/",
          "/admin/",
          "/app",
          "/assistant",
          "/protected",
          "/guide",
          "/steuer",
          "/finanzamt",
          "/finanzbildung",
          "/email-generator",
          "/pruefung",
          "/kosten-senken",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
