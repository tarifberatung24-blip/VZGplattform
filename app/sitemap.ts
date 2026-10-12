import type { MetadataRoute } from "next"

const baseUrl = "https://vzgplattform.onrender.com"
const publicPaths = [
  "",
  "/how-it-works",
  "/contact",
  "/anfrage",
  "/zayavka",
  "/functions",
  "/security",
  "/versicherungen",
  "/finanzbildung",
  "/kindergeld",
  "/anspruch",
  "/za-nas",
  "/datenschutz",
  "/agb",
  "/impressum",
  "/widerruf",
  "/affiliate-hinweis",
]

export default function sitemap(): MetadataRoute.Sitemap {
  return ["bg", "de"].flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : 0.6,
    })),
  )
}
