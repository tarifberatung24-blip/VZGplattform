import type { JsonLd } from "@/lib/seo/json-ld"

/**
 * Renders one or more JSON-LD blocks.
 *
 * `JSON.stringify` output is escaped for `<` because a `</script>` sequence inside
 * a string value would otherwise close the tag early and turn the rest of the
 * payload into markup. The content is built from page copy and the public
 * Impressum, so this is a guard rather than a live problem.
 */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  const blocks = Array.isArray(data) ? data : [data]
  return (
    <>
      {blocks.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  )
}
