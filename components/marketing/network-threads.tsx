"use client"

import { useTheme } from "next-themes"

/**
 * Layer 0 background network — the "infrastructure electricity".
 *
 * A fixed, non-interactive layer behind the whole public page. Thin glowing
 * threads carry pulsing packets, so the platform reads as live wiring rather
 * than a flat backdrop. The colour follows the active theme: blue on white in
 * the light theme, orange on black in the dark one, through the --thread-*
 * tokens in globals.css.
 *
 * Trimmed from the approved v0 hero (36 threads -> 12) and stripped of the
 * feTurbulence filters to keep the fixed layer cheap to composite; motion is
 * suppressed under prefers-reduced-motion by .layer0-network in globals.css.
 */

const TOKEN_VARS = {
  core: "var(--thread-core)",
  glow: "var(--thread-glow)",
  edge: "var(--thread-edge)",
} as const

type ThreadToken = keyof typeof TOKEN_VARS

function threadColor(token: ThreadToken, opacity = 1) {
  const base = TOKEN_VARS[token]
  if (opacity >= 1) return base
  return `color-mix(in srgb, ${base} ${Math.round(opacity * 100)}%, transparent)`
}

export function NetworkThreads() {
  // Re-render on theme change so the SVG gradient stops pick up the new tokens.
  useTheme()

  return (
    <div className="layer0-network" aria-hidden="true">
      <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 1200 800"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <radialGradient id="neonPulse1" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                      <stop offset="30%" stopColor={threadColor("glow")} stopOpacity={1.0} />
                      <stop offset="70%" stopColor={threadColor("core")} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={threadColor("core")} stopOpacity={0.0} />
                    </radialGradient>
                    <radialGradient id="neonPulse2" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={0.9} />
                      <stop offset="25%" stopColor={threadColor("glow")} stopOpacity={0.9} />
                      <stop offset="60%" stopColor={threadColor("core")} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={threadColor("core")} stopOpacity={0.0} />
                    </radialGradient>
                    <radialGradient id="neonPulse3" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                      <stop offset="35%" stopColor={threadColor("glow")} stopOpacity={1.0} />
                      <stop offset="75%" stopColor={threadColor("core")} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={threadColor("core")} stopOpacity={0.0} />
                    </radialGradient>
                    {/* Adding hero text background gradients and filters */}
                    <radialGradient id="heroTextBg" cx="30%" cy="50%" r="70%">
                      <stop offset="0%" stopColor={threadColor("core")} stopOpacity={0.15} />
                      <stop offset="40%" stopColor={threadColor("glow")} stopOpacity={0.08} />
                      <stop offset="80%" stopColor={threadColor("core")} stopOpacity={0.05} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                    </radialGradient>
                                  <linearGradient id="backgroundFade1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                      <stop offset="20%" stopColor={threadColor("core")} stopOpacity={0.15} />
                      <stop offset="80%" stopColor={threadColor("core")} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="backgroundFade2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                      <stop offset="15%" stopColor={threadColor("glow")} stopOpacity={0.12} />
                      <stop offset="85%" stopColor={threadColor("glow")} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="backgroundFade3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                      <stop offset="25%" stopColor={threadColor("core")} stopOpacity={0.18} />
                      <stop offset="75%" stopColor={threadColor("core")} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="threadFade1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                      <stop offset="15%" stopColor={threadColor("core")} stopOpacity={0.8} />
                      <stop offset="85%" stopColor={threadColor("core")} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                    </linearGradient>
                    <linearGradient id="threadFade2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                      <stop offset="12%" stopColor={threadColor("glow")} stopOpacity={0.7} />
                      <stop offset="88%" stopColor={threadColor("glow")} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                    </linearGradient>
                    <linearGradient id="threadFade3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                      <stop offset="18%" stopColor={threadColor("core")} stopOpacity={0.8} />
                      <stop offset="82%" stopColor={threadColor("core")} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={threadColor("edge")} stopOpacity={1.0} />
                    </linearGradient>
                                  <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g>
                    {/* Adding hero text background shape */}
                    <ellipse
                      cx="300"
                      cy="350"
                      rx="400"
                      ry="200"
                      fill="url(#heroTextBg)"
               
                      opacity="0.6"
                    />
                    <ellipse
                      cx="350"
                      cy="320"
                      rx="500"
                      ry="250"
                      fill="url(#heroTextBg)"
               
                      opacity="0.4"
                    />
                    <ellipse
                      cx="400"
                      cy="300"
                      rx="600"
                      ry="300"
                      fill="url(#heroTextBg)"
               
                      opacity="0.2"
                    />

                    {/* Thread 1 - Smooth S-curve from bottom-left to right */}
                    <path
                      id="thread1"
                      d="M50 720 Q200 590 350 540 Q500 490 650 520 Q800 550 950 460 Q1100 370 1200 340"
                      stroke="url(#threadFade1)"
                      strokeWidth="0.8"
                      fill="none"
                      opacity="0.8"
                    />
                    <circle r="2" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="4s" repeatCount="indefinite">
                        <mpath href="#thread1" />
                      </animateMotion>
                    </circle>

                    {/* Thread 2 - Gentle wave flow */}
                    <path
                      id="thread2"
                      d="M80 730 Q250 620 400 570 Q550 520 700 550 Q850 580 1000 490 Q1150 400 1300 370"
                      stroke="url(#threadFade2)"
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.7"
                    />
                    <circle r="3" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="5s" repeatCount="indefinite">
                        <mpath href="#thread2" />
                      </animateMotion>
                    </circle>

                    {/* Thread 3 - Organic curve */}
                    <path
                      id="thread3"
                      d="M20 710 Q180 580 320 530 Q460 480 600 510 Q740 540 880 450 Q1020 360 1200 330"
                      stroke="url(#threadFade3)"
                      strokeWidth="1.2"
                      fill="none"
                      opacity="0.8"
                    />
                    <circle r="2.5" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="4.5s" repeatCount="indefinite">
                        <mpath href="#thread3" />
                      </animateMotion>
                    </circle>

                    {/* Thread 4 - Flowing curve */}
                    <path
                      id="thread4"
                      d="M120 740 Q280 640 450 590 Q620 540 770 570 Q920 600 1070 510 Q1220 420 1350 390"
                      stroke="url(#threadFade1)"
                      strokeWidth="0.6"
                      fill="none"
                      opacity="0.6"
                    />
                    <circle r="1.5" fill="url(#neonPulse3)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="5.5s" repeatCount="indefinite">
                        <mpath href="#thread4" />
                      </animateMotion>
                    </circle>

                    {/* Thread 5 - Natural wave */}
                    <path
                      id="thread5"
                      d="M60 725 Q220 600 380 550 Q540 500 680 530 Q820 560 960 470 Q1100 380 1280 350"
                      stroke="url(#threadFade2)"
                      strokeWidth="1.0"
                      fill="none"
                      opacity="0.7"
                    />
                    <circle r="2.2" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="4.2s" repeatCount="indefinite">
                        <mpath href="#thread5" />
                      </animateMotion>
                    </circle>

                    {/* Thread 6 - Smooth flow */}
                    <path
                      id="thread6"
                      d="M150 735 Q300 660 480 610 Q660 560 800 590 Q940 620 1080 530 Q1220 440 1400 410"
                      stroke="url(#threadFade3)"
                      strokeWidth="1.3"
                      fill="none"
                      opacity="0.6"
                    />
                    <circle r="2.8" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="5.2s" repeatCount="indefinite">
                        <mpath href="#thread6" />
                      </animateMotion>
                    </circle>

                    {/* Thread 7 - Organic S-curve */}
                    <path
                      id="thread7"
                      d="M40 715 Q190 585 340 535 Q490 485 630 515 Q770 545 910 455 Q1050 365 1250 335"
                      stroke="url(#threadFade1)"
                      strokeWidth="0.9"
                      fill="none"
                      opacity="0.8"
                    />
                    <circle r="2" fill="url(#neonPulse3)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="4.8s" repeatCount="indefinite">
                        <mpath href="#thread7" />
                      </animateMotion>
                    </circle>

                    {/* Thread 8 - Gentle wave */}
                    <path
                      id="thread8"
                      d="M100 728 Q260 630 420 580 Q580 530 720 560 Q860 590 1000 500 Q1140 410 1320 380"
                      stroke="url(#threadFade2)"
                      strokeWidth="1.4"
                      fill="none"
                      opacity="0.7"
                    />
                    <circle r="3" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="5.8s" repeatCount="indefinite">
                        <mpath href="#thread8" />
                      </animateMotion>
                    </circle>

                    {/* Thread 9 - Thin flowing curve */}
                    <path
                      id="thread9"
                      d="M30 722 Q170 595 310 545 Q450 495 590 525 Q730 555 870 465 Q1010 375 1180 345"
                      stroke="url(#threadFade3)"
                      strokeWidth="0.5"
                      fill="none"
                      opacity="0.6"
                    />
                    <circle r="1.2" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="6s" repeatCount="indefinite">
                        <mpath href="#thread9" />
                      </animateMotion>
                    </circle>

                    {/* Thread 10 - Medium thick wave */}
                    <path
                      id="thread10"
                      d="M90 732 Q240 625 390 575 Q540 525 680 555 Q820 585 960 495 Q1100 405 1300 375"
                      stroke="url(#threadFade1)"
                      strokeWidth="1.1"
                      fill="none"
                      opacity="0.8"
                    />
                    <circle r="2.5" fill="url(#neonPulse3)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="4.3s" repeatCount="indefinite">
                        <mpath href="#thread10" />
                      </animateMotion>
                    </circle>

                    {/* Thread 11 - Very thin thread */}
                    <path
                      id="thread11"
                      d="M70 727 Q210 605 360 555 Q510 505 650 535 Q790 565 930 475 Q1070 385 1260 355"
                      stroke="url(#threadFade2)"
                      strokeWidth="0.4"
                      fill="none"
                      opacity="0.5"
                    />
                    <circle r="1" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="5.7s" repeatCount="indefinite">
                        <mpath href="#thread11" />
                      </animateMotion>
                    </circle>

                    {/* Thread 12 - Thick flowing line */}
                    <path
                      id="thread12"
                      d="M110 738 Q270 645 430 595 Q590 545 730 575 Q870 605 1010 515 Q1150 425 1380 395"
                      stroke="url(#threadFade3)"
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.7"
                    />
                    <circle r="3.2" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)">
                      <animateMotion dur="4.7s" repeatCount="indefinite">
                        <mpath href="#thread12" />
                      </animateMotion>
                    </circle>
                  </g>
                </svg>
    </div>
  )
}
