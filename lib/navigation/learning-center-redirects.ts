import { stripLocale } from "@/lib/i18n/routing"
import { LEARNING_CENTER_PATH } from "@/lib/learning-center/copy"

/**
 * The three public index routes that the Learning Center replaces.
 *
 * `/[locale]/how-it-works`, `/[locale]/ratgeber` and `/[locale]/vorlagen` are now
 * one page with four numbered paths, so each old index forwards to the path that
 * answers it. The hash is part of the target on purpose: it lands the reader on the
 * relevant numbered section rather than the top of the page.
 *
 * Only the index routes are listed. Every individual guide and letter detail route
 * stays reachable — those are the pages external links point at, and redirecting
 * them would break the backlinks the SEO work was built to earn.
 */
export type LearningCenterRedirect = { path: string; hash: string }

export const learningCenterRedirects: Readonly<Record<string, LearningCenterRedirect>> = {
  "/how-it-works": { path: LEARNING_CENTER_PATH, hash: "functions" },
  "/ratgeber": { path: LEARNING_CENTER_PATH, hash: "guides" },
  "/vorlagen": { path: LEARNING_CENTER_PATH, hash: "letters" },
}

/** The Learning Center target for a replaced index route, or null. */
export function learningCenterRedirectTarget(pathname: string): LearningCenterRedirect | null {
  return learningCenterRedirects[stripLocale(pathname)] ?? null
}
