/**
 * Decorative reflective vehicle graphic for the Kfz landing hero.
 *
 * Purely presentational: it carries no price, rating or brand claim, so it is
 * hidden from assistive technology and rendered from inline SVG rather than a
 * bitmap asset. The reflection is the mirrored silhouette behind a fading mask.
 */
export function KfzHeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-56 w-full items-end justify-center overflow-hidden sm:h-64"
    >
      <div className="pointer-events-none absolute inset-x-6 bottom-24 h-32 rounded-full bg-primary/25 blur-3xl" />
      <svg viewBox="0 0 420 200" className="relative w-full max-w-md text-foreground" role="presentation">
        <defs>
          <linearGradient id="kfz-reflection" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="kfz-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Reflection: the body mirrored and faded out. */}
        <g transform="translate(0,300) scale(1,-1)" opacity="0.5">
          <path
            d="M40 150 C60 118 96 104 150 100 L196 78 C214 68 240 62 268 62 L320 62 C352 62 380 74 396 96 L404 118 C410 128 412 138 408 150 Z"
            fill="url(#kfz-reflection)"
          />
        </g>

        {/* Body. */}
        <path
          d="M40 150 C60 118 96 104 150 100 L196 78 C214 68 240 62 268 62 L320 62 C352 62 380 74 396 96 L404 118 C410 128 412 138 408 150 L378 150 A26 26 0 0 0 326 150 L150 150 A26 26 0 0 0 98 150 Z"
          fill="url(#kfz-body)"
        />
        {/* Windows. */}
        <path d="M168 98 L206 80 C220 72 240 68 262 68 L300 68 L300 96 Z" fill="#070d19" opacity="0.55" />
        <path d="M310 68 L342 68 C362 70 378 80 390 98 L310 96 Z" fill="#070d19" opacity="0.55" />
        {/* Wheels. */}
        <circle cx="124" cy="150" r="20" fill="#070d19" />
        <circle cx="124" cy="150" r="8" fill="currentColor" opacity="0.5" />
        <circle cx="352" cy="150" r="20" fill="#070d19" />
        <circle cx="352" cy="150" r="8" fill="currentColor" opacity="0.5" />
        {/* Ground line. */}
        <rect x="30" y="168" width="380" height="2" rx="1" fill="currentColor" opacity="0.2" />
      </svg>
    </div>
  )
}
