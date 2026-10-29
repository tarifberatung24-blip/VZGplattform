import { guideTopics as coreTopics } from "./topics"
import { guideTopicsAuthorities } from "./topics-authorities"
import { guideTopicsEveryday } from "./topics-everyday"
import type { GuideCategoryId, GuideTopic } from "./types"

export { guideCategories } from "./topics"
export type { GuideCategory, GuideCategoryId, GuideLocaleContent, GuideSource, GuideTopic } from "./types"

/**
 * Every guide page, in one list.
 *
 * The topics are split across files only to keep each one readable; the index is
 * the single source of truth. The page routes, the sitemap and the search index all
 * read this array, so a new topic becomes reachable everywhere by being added here
 * — there is no second list to update and therefore none to forget.
 */
export const guideTopics: GuideTopic[] = [...coreTopics, ...guideTopicsAuthorities, ...guideTopicsEveryday]

export function findGuideTopic(slug: string): GuideTopic | undefined {
  return guideTopics.find((topic) => topic.slug === slug)
}

export function guideTopicsByCategory(category: GuideCategoryId): GuideTopic[] {
  return guideTopics.filter((topic) => topic.category === category)
}

/** The path of a guide page, without the locale prefix. */
export function guidePath(slug: string): string {
  return `/ratgeber/${slug}`
}

export const GUIDE_INDEX_PATH = "/ratgeber"
