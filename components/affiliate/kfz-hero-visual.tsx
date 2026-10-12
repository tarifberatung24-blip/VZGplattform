/**
 * Decorative vehicle graphic for the Kfz landing hero.
 *
 * It is intentionally brand-neutral and contains no price, rating or product
 * claim. The car, shield and document panel are inline art so the hero stays
 * crisp, fast and easy to theme on small screens.
 */
export function KfzHeroVisual() {
  return (
    <div aria-hidden="true" className="kfz-visual-stage relative mx-auto h-[20rem] w-full max-w-[38rem] sm:h-[25rem]">
      <div className="kfz-visual-orb pointer-events-none absolute inset-x-8 bottom-8 h-36 rounded-full blur-3xl" />
      <div className="kfz-visual-grid pointer-events-none absolute inset-0 rounded-[2rem]" />

      <svg viewBox="0 0 520 280" className="absolute inset-x-0 bottom-2 z-10 h-auto w-full" role="presentation">
        <defs>
          <linearGradient id="kfz-reflection" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86c8ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#86c8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="kfz-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8edff" />
            <stop offset="42%" stopColor="#5c9ddd" />
            <stop offset="100%" stopColor="#164b86" />
          </linearGradient>
          <linearGradient id="kfz-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#071c39" />
            <stop offset="55%" stopColor="#124c85" />
            <stop offset="100%" stopColor="#061326" />
          </linearGradient>
          <linearGradient id="kfz-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#66c4ff" />
            <stop offset="100%" stopColor="#087cff" />
          </linearGradient>
          <filter id="kfz-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path d="M64 222 C142 188 294 184 438 218 L454 230 C314 222 180 226 64 238 Z" fill="url(#kfz-reflection)" opacity="0.42" />
        <path d="M54 196 C77 157 116 139 180 134 L235 97 C253 86 280 81 314 81 L371 81 C410 82 442 102 460 133 L474 173 C480 185 478 196 469 204 L431 204 A30 30 0 0 0 371 204 L181 204 A30 30 0 0 0 121 204 L72 204 C59 204 49 202 54 196 Z" fill="url(#kfz-body)" stroke="#95d4ff" strokeOpacity="0.72" strokeWidth="2" />
        <path d="M197 132 L243 100 C260 89 283 86 312 86 L351 86 L352 132 Z" fill="url(#kfz-glass)" stroke="#b7e2ff" strokeOpacity="0.35" />
        <path d="M362 86 L377 87 C408 90 431 105 451 133 L362 132 Z" fill="url(#kfz-glass)" stroke="#b7e2ff" strokeOpacity="0.35" />
        <path d="M73 170 C106 162 133 158 165 157" fill="none" stroke="#e3f4ff" strokeOpacity="0.66" strokeWidth="3" strokeLinecap="round" />
        <path d="M411 161 L462 161" fill="none" stroke="#8bd0ff" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
        <circle cx="151" cy="205" r="29" fill="#030b1a" stroke="#6eb8ee" strokeWidth="3" />
        <circle cx="151" cy="205" r="12" fill="#2871b4" stroke="#b8e3ff" strokeOpacity="0.65" strokeWidth="3" />
        <circle cx="390" cy="205" r="29" fill="#030b1a" stroke="#6eb8ee" strokeWidth="3" />
        <circle cx="390" cy="205" r="12" fill="#2871b4" stroke="#b8e3ff" strokeOpacity="0.65" strokeWidth="3" />

        <g filter="url(#kfz-glow)" transform="translate(360 114)">
          <path d="M45 0 L82 13 V47 C82 72 65 92 45 103 C25 92 8 72 8 47 V13 Z" fill="#06162d" stroke="url(#kfz-shield)" strokeWidth="4" />
          <path d="M28 48 L40 60 L63 33" fill="none" stroke="#9ddaff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M46 244 H476" stroke="#1e91ff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
        <path d="M118 254 H398" stroke="#75c8ff" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="kfz-visual-card absolute right-2 top-4 z-20 hidden w-32 p-3 sm:block">
        <div className="mb-3 h-1.5 w-10 rounded-full bg-[#5dbbff]" />
        <div className="h-2 w-20 rounded-full bg-white/70" />
        <div className="mt-2 h-1.5 w-24 rounded-full bg-white/20" />
        <div className="mt-5 space-y-2.5">
          <span className="flex items-center gap-2"><i /><b /></span>
          <span className="flex items-center gap-2"><i /><b /></span>
          <span className="flex items-center gap-2"><i /><b /></span>
        </div>
      </div>
    </div>
  )
}
