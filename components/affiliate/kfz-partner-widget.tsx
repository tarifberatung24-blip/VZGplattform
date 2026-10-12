"use client"

import { useEffect, useRef, useState } from "react"
import { Calculator, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandText } from "@/components/brand/horizon-wordmark"

const WIDGET_SRC = "https://form.partner-versicherung.de/widgets/203170/tcpp-iframe-kfz/kfz-iframe.js"

type WidgetCopy = { privacy: string; loadCta: string; fallbackCta: string }

/**
 * Partner Kfz calculator (partner-versicherung.de, routed to CHECK24).
 *
 * Two-click pattern: nothing is requested from the partner until the visitor
 * presses the button, because the widget sets third-party cookies and a pixel.
 * The script runs at top level and looks up `#tcpp-iframe-kfz`, so it is only
 * appended after the container is in the DOM. `data-tracking` is the sub-ID the
 * widget documents; it tells the partner report which HORIZON page sold.
 */
export function KfzPartnerWidget({
  copy,
  tracking,
  fallbackHref,
}: {
  copy: WidgetCopy
  tracking: string
  fallbackHref?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loaded || !container.current) return
    const script = document.createElement("script")
    script.src = WIDGET_SRC
    script.async = true
    container.current.after(script)
    return () => script.remove()
  }, [loaded])

  if (!loaded) {
    return (
      <div className="paper paper-inset flex flex-col items-start gap-4 p-6">
        <p className="text-sm leading-7 text-muted-foreground"><BrandText text={copy.privacy} /></p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => setLoaded(true)}>
            <Calculator data-icon="inline-start" />
            <BrandText text={copy.loadCta} />
          </Button>
          {fallbackHref && (
            <a
              href={fallbackHref}
              rel="sponsored noopener"
              target="_blank"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <BrandText text={copy.fallbackCta} />
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    )
  }

  return <div ref={container} id="tcpp-iframe-kfz" data-style="custom_blue" data-tracking={tracking} style={{ width: "100%" }} />
}
