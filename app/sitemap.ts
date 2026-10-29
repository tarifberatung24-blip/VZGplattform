import type { MetadataRoute } from "next"
import { guidePath, guideTopics } from "@/lib/ratgeber"
import { absoluteUrl } from "@/lib/seo/site"

/**
 * Public, indexable paths, each also reachable under both locales.
 *
 * The guide index and every guide topic are appended from the corpus itself rather
 * than written out here, so a new topic cannot be published and forgotten in the
 * sitemap. Private and authenticated routes are absent by construction: nothing
 * that renders a login wall is ever listed.
 */
const publicPaths = [
  "",
  "/how-it-works",
  "/contact",
  "/anfrage",
  "/zayavka",
  "/security",
  "/versicherungen",
  "/kindergeld",
  "/anspruch",
  "/za-nas",
  "/datenschutz",
  "/agb",
  "/impressum",
  "/widerruf",
  "/affiliate-hinweis",
  "/ratgeber",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const topicPaths = guideTopics.map((topic) => guidePath(topic.slug))
  const allPaths = [...publicPaths, ...topicPaths]

  return ["bg", "de"].flatMap((locale) =>
    allPaths.map((path) => {
      const isRoot = path === ""
      // A guide page is the most likely to have been edited, and its priority
      // reflects that it answers a specific question rather than being a hub.
      const isGuide = path.startsWith("/ratgeber/")
      return {
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: new Date(),
        changeFrequency: isRoot ? ("weekly" as const) : ("monthly" as const),
        priority: isRoot ? 1 : isGuide ? 0.8 : 0.6,
        alternates: {
          languages: {
            bg: absoluteUrl(`/bg${path}`),
            de: absoluteUrl(`/de${path}`),
          },
        },
      }
    }),
  )
}
