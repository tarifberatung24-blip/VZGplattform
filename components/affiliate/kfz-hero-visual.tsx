/**
 * Decorative vehicle artwork for the Kfz campaign.
 *
 * Drawn as an inline vector so it stays crisp at any size and needs no extra
 * network request. It is deliberately hidden from assistive technology because
 * the adjacent hero copy carries the page meaning and CTA.
 */
export function KfzHeroVisual() {
  return (
    <div aria-hidden="true" className="kfz-visual-stage relative mx-auto h-[20rem] w-full max-w-[38rem] sm:h-[25rem]">
      <div className="kfz-visual-orb pointer-events-none absolute inset-x-8 bottom-8 h-36 rounded-full blur-3xl" />
      <div className="kfz-visual-grid pointer-events-none absolute inset-0 rounded-[2rem]" />

      <svg
        viewBox="72 246 1140 428"
        preserveAspectRatio="xMidYMid meet"
        className="kfz-hero-car relative z-10 mx-auto h-full w-full"
        focusable="false"
      >
        <defs>
          <linearGradient id="kfzPaint" x1="0.15" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#d8efff" />
            <stop offset="0.12" stopColor="#8ecbfb" />
            <stop offset="0.34" stopColor="#4a9ce8" />
            <stop offset="0.58" stopColor="#2a72bb" />
            <stop offset="0.82" stopColor="#1a4f8c" />
            <stop offset="1" stopColor="#0d3560" />
          </linearGradient>
          <linearGradient id="kfzPaintTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2faff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#f2faff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="kfzPaintSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f83cf" stopOpacity="0.75" />
            <stop offset="1" stopColor="#123f75" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="kfzGlass" x1="0.1" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#e2f0fd" stopOpacity="0.92" />
            <stop offset="0.32" stopColor="#8fb6da" stopOpacity="0.78" />
            <stop offset="0.72" stopColor="#22405f" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0c1c2e" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id="kfzChrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#b6c8da" />
            <stop offset="0.55" stopColor="#8ea2b8" />
            <stop offset="1" stopColor="#eef5fc" />
          </linearGradient>
          <linearGradient id="kfzRim" x1="0.2" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#c3d0de" />
            <stop offset="1" stopColor="#66748a" />
          </linearGradient>
          <radialGradient id="kfzTire" cx="0.38" cy="0.32" r="0.78">
            <stop offset="0" stopColor="#3a424e" />
            <stop offset="0.7" stopColor="#161a21" />
            <stop offset="1" stopColor="#07090d" />
          </radialGradient>
          <linearGradient id="kfzLamp" x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#cfe9ff" />
            <stop offset="1" stopColor="#6fb6ff" />
          </linearGradient>
          <linearGradient id="kfzTail" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0" stopColor="#ff6a5c" />
            <stop offset="1" stopColor="#c02a20" />
          </linearGradient>
          <radialGradient id="kfzGround" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#000509" stopOpacity="0.82" />
            <stop offset="0.5" stopColor="#000509" stopOpacity="0.4" />
            <stop offset="1" stopColor="#000509" stopOpacity="0" />
          </radialGradient>
          <filter id="kfzBlur18" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="kfzBlur12" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        <ellipse cx="640" cy="640" rx="470" ry="46" fill="url(#kfzGround)" filter="url(#kfzBlur18)" />
        <ellipse cx="640" cy="612" rx="470" ry="26" fill="url(#kfzGround)" filter="url(#kfzBlur12)" />

        <g>
          <path
            d="M120 560 C96 516 104 452 140 420 L232 412 C288 372 340 316 412 288 L648 268 C736 264 812 282 862 314 C906 342 964 364 1032 372 L1112 378 C1160 384 1178 408 1172 442 C1168 490 1148 542 1116 576 L1064 582 A118 118 0 0 0 828 582 L452 582 A118 118 0 0 0 216 582 Z"
            fill="url(#kfzPaint)"
            stroke="#04182e"
            strokeWidth="3"
          />
          <path
            d="M232 412 L1112 378 C1160 384 1178 408 1172 442 C1168 490 1148 542 1116 576 L1064 582 A118 118 0 0 0 828 582 L452 582 A118 118 0 0 0 216 582 C150 570 128 528 140 470 Z"
            fill="url(#kfzPaintSide)"
            opacity="0.55"
          />
          <path
            d="M150 424 L232 412 C288 372 340 316 412 288 L648 268 C736 264 812 282 862 314 C906 342 964 364 1032 372 L1112 378 C1156 383 1174 404 1172 434 L1010 412 L300 428 Z"
            fill="url(#kfzPaintTop)"
            opacity="0.55"
          />

          <path d="M168 424 L1160 388" stroke="url(#kfzChrome)" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
          <path d="M244 574 L1044 574" stroke="#010c18" strokeWidth="14" opacity="0.3" strokeLinecap="round" />
          <path d="M330 556 L980 552" stroke="#7cc0f7" strokeWidth="5" opacity="0.4" strokeLinecap="round" />
          <path
            d="M140 470 C150 570 216 582 216 582 L1064 582 C1148 542 1168 490 1172 442"
            fill="none"
            stroke="#9ed4ff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
          />

          <path
            d="M300 412 C352 372 398 314 466 290 L640 272 C700 270 754 288 796 314 C834 340 874 366 906 384 Z"
            fill="url(#kfzGlass)"
            stroke="#082238"
            strokeWidth="2.5"
          />

          <path d="M566 274 L566 408" stroke="#0a2c4e" strokeWidth="15" strokeLinecap="round" />
          <path d="M452 288 L482 406" stroke="#0a2c4e" strokeWidth="12" strokeLinecap="round" />
          <path d="M806 314 L836 404" stroke="#0a2c4e" strokeWidth="12" strokeLinecap="round" />

          <path d="M330 392 C378 346 414 304 470 292 L556 282 L512 392 Z" fill="#f2f9ff" opacity="0.2" />
          <path d="M600 280 L644 274 C694 272 742 288 776 312 L644 318 Z" fill="#f2f9ff" opacity="0.14" />
          <path d="M468 290 L642 272" stroke="#eef7ff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />

          <path d="M566 414 L566 566" stroke="#04182e" strokeWidth="2.5" opacity="0.5" />
          <path d="M772 410 L772 566" stroke="#04182e" strokeWidth="2.5" opacity="0.42" />
          <path d="M880 406 L880 540" stroke="#04182e" strokeWidth="2" opacity="0.32" />

          <rect x="612" y="440" width="44" height="11" rx="5.5" fill="url(#kfzChrome)" opacity="0.94" />
          <rect x="866" y="436" width="44" height="11" rx="5.5" fill="url(#kfzChrome)" opacity="0.94" />

          <path d="M818 330 L870 328 L878 350 L824 348 Z" fill="#10416f" stroke="#082238" strokeWidth="2" />
          <path d="M870 330 L888 340" stroke="#082238" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M822 334 L866 333" stroke="#8fc6f5" strokeWidth="2" opacity="0.6" />

          <path
            d="M1052 384 C1090 386 1116 400 1122 418 C1122 428 1112 434 1096 434 L1036 424 C1028 406 1034 392 1052 384 Z"
            fill="url(#kfzLamp)"
          />
          <path d="M1062 400 L1106 412" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
          <path d="M1062 412 L1100 422" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

          <path d="M120 424 L174 420 L174 448 L128 452 C114 448 112 434 120 424 Z" fill="url(#kfzTail)" />
          <path d="M130 432 L166 429" stroke="#ffd9d3" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />

          <path d="M1076 468 L1116 462 C1118 480 1110 500 1092 506 L1062 502 Z" fill="#031324" opacity="0.85" />

          <path d="M1064 582 A118 118 0 0 1 828 582" fill="none" stroke="#010a16" strokeWidth="16" opacity="0.55" />
          <path d="M452 582 A118 118 0 0 1 216 582" fill="none" stroke="#010a16" strokeWidth="16" opacity="0.55" />

          <g>
            <circle cx="946" cy="544" r="80" fill="url(#kfzTire)" />
            <circle cx="946" cy="544" r="80" fill="none" stroke="#04070b" strokeWidth="2" />
            <circle cx="946" cy="544" r="56" fill="url(#kfzRim)" stroke="#4a586b" strokeWidth="2" />
            <circle cx="946" cy="544" r="56" fill="none" stroke="#f2f8ff" strokeWidth="1.5" opacity="0.5" />
            <g stroke="#7f8d9f" strokeWidth="9" strokeLinecap="round">
              <path d="M946 544 L946 494" />
              <path d="M946 544 L990 518" />
              <path d="M946 544 L990 570" />
              <path d="M946 544 L946 594" />
              <path d="M946 544 L902 570" />
              <path d="M946 544 L902 518" />
            </g>
            <circle cx="946" cy="544" r="13" fill="#e9f0f8" stroke="#6d7c8e" strokeWidth="1.5" />
          </g>
          <g>
            <circle cx="334" cy="544" r="80" fill="url(#kfzTire)" />
            <circle cx="334" cy="544" r="80" fill="none" stroke="#04070b" strokeWidth="2" />
            <circle cx="334" cy="544" r="56" fill="url(#kfzRim)" stroke="#4a586b" strokeWidth="2" />
            <circle cx="334" cy="544" r="56" fill="none" stroke="#f2f8ff" strokeWidth="1.5" opacity="0.5" />
            <g stroke="#7f8d9f" strokeWidth="9" strokeLinecap="round">
              <path d="M334 544 L334 494" />
              <path d="M334 544 L378 518" />
              <path d="M334 544 L378 570" />
              <path d="M334 544 L334 594" />
              <path d="M334 544 L290 570" />
              <path d="M334 544 L290 518" />
            </g>
            <circle cx="334" cy="544" r="13" fill="#e9f0f8" stroke="#6d7c8e" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
    </div>
  )
}
