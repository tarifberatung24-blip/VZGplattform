/**
 * impact.com tracking for the Shopify affiliate programme.
 *
 * The script is loaded only after the visitor said yes to the "partner" category of the cookie
 * notice (see consent.ts); without that answer nothing is requested from impact.com.
 *
 * IMPACT_VERIFICATION_SNIPPET is the snippet exactly as impact.com hands it out. It sits inert
 * in the page head (type="text/plain", never executed) so that impact.com's "Add website" check
 * can find it. The code that runs after consent is `loadImpact` below, which does the same
 * thing as the snippet.
 */
export const IMPACT_SCRIPT_URL = "https://utt.impactcdn.com/P-A7950557-e342-4625-872f-e947bd3cf9e11.js"

export const IMPACT_VERIFICATION_SNIPPET =
  `(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('${IMPACT_SCRIPT_URL}','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`

type ImpactQueue = ((...args: unknown[]) => void) & { a?: unknown[][] }
type ImpactWindow = Window & { ire_o?: string; impactStat?: ImpactQueue; __horizonImpactLoaded?: boolean }

/** Loads the impact.com script once per page load. Call it only when consent is given. */
export function loadImpact(): void {
  const w = window as ImpactWindow
  if (w.__horizonImpactLoaded) return
  w.__horizonImpactLoaded = true

  w.ire_o = "impactStat"
  const queue: ImpactQueue =
    w.impactStat ??
    ((...args: unknown[]) => {
      ;(queue.a = queue.a || []).push(args)
    })
  w.impactStat = queue

  const script = document.createElement("script")
  script.async = true
  script.src = IMPACT_SCRIPT_URL
  document.head.appendChild(script)

  queue("transformLinks")
  queue("trackImpression")
}
