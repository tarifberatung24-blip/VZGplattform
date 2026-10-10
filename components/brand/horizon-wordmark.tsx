import { Fragment, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The product name, drawn in the same letterforms as the header logo.
 *
 * Owner rule: wherever the platform writes the product name it uses this
 * wordmark, never plain text in the body font. The full "HORIZON by VZG" stays
 * only in the header logo, the footer and official texts (legal pages,
 * disclaimers, document letterheads, page metadata).
 *
 * The glyphs come from `public/logo-horizon-wordmark.png` (cropped from the
 * header logo, without the registration mark and "by VZG") and are painted with
 * the current text colour through a CSS mask, so the mark follows the theme and
 * whatever colour the surrounding text has. Screen readers and copy/paste get
 * the word "Horizon".
 */
export function HorizonWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("horizon-wordmark", className)}>
      <span className="sr-only">Horizon</span>
    </span>
  )
}

/** Matches the product name as it appears in copy, with or without "by VZG". */
export const BRAND_PATTERN = /\bHORIZON(?: by VZG)?\b/g

/**
 * Renders a copy string with every product name drawn as the wordmark.
 *
 * In running text "HORIZON by VZG" becomes just the wordmark: the long form
 * belongs to the header, footer and official texts. Pass `official` for those
 * official texts (disclaimers, affiliate disclosures, privacy notes): the
 * wordmark is still used, but " by VZG" is kept so the legal naming stays whole.
 */
export function BrandText({
  text,
  official = false,
}: {
  text: string | number | null | undefined
  official?: boolean
}): ReactNode {
  if (typeof text !== "string") return text
  const matches = text.match(BRAND_PATTERN)
  if (!matches) return text
  const parts = text.split(BRAND_PATTERN)
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? (
        <>
          <HorizonWordmark />
          {official && matches[index - 1].endsWith("by VZG") ? " by VZG" : null}
        </>
      ) : null}
      {part}
    </Fragment>
  ))
}
