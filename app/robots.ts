import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://vzgplattform.onrender.com"
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/dashboard", "/documents", "/profil", "/konto/", "/admin/", "/app", "/assistant", "/protected"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
